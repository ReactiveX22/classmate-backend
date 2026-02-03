/**
 * Post Task Module
 *
 * Reusable task functions for classroom post operations.
 * Includes simple posts and posts with file attachments.
 */

import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import http from 'k6/http';

// Metrics
const postCreateDuration = new Trend('task_post_create_duration', true);
const postListDuration = new Trend('task_post_list_duration', true);
const postWithAttachmentDuration = new Trend(
  'task_post_with_attachment_duration',
  true,
);
const postCreateSuccess = new Counter('task_post_create_success');
const postCreateFailure = new Counter('task_post_create_failure');

/**
 * Post types matching the API enum
 */
export const PostType = {
  ANNOUNCEMENT: 'announcement',
  ASSIGNMENT: 'assignment',
  MATERIAL: 'material',
  QUESTION: 'question',
};

/**
 * List posts for a classroom
 *
 * @param {Object} client - HTTP client with auth
 * @param {Object} context - Must contain: classroomId
 * @returns {Object} - Response with posts
 */
export function listPosts(client, context) {
  const { classroomId } = context;

  if (!classroomId) {
    console.error('[listPosts] Missing classroomId in context');
    return null;
  }

  const startTime = Date.now();

  // Note: Posts are accessed via upcoming-posts or through classroom details
  const res = client.get(`/api/v1/classrooms/${classroomId}/upcoming-posts`, {
    tags: { endpoint: 'posts_list', task: 'listPosts' },
  });

  postListDuration.add(Date.now() - startTime);

  check(res, {
    'posts listed': (r) => r.status === 200,
  });

  if (res.status === 200) {
    try {
      const posts = JSON.parse(res.body);
      if (posts.length > 0) {
        // Store a random post ID for subsequent tasks
        context.postId = posts[Math.floor(Math.random() * posts.length)].id;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return res;
}

/**
 * Create a simple post without attachments
 *
 * @param {Object} client - HTTP client with auth (teacher)
 * @param {Object} context - Must contain: classroomId, uniqueId
 * @returns {Object} - Response with created post
 */
export function createSimplePost(client, context) {
  const { classroomId, uniqueId } = context;

  if (!classroomId) {
    console.error('[createSimplePost] Missing classroomId in context');
    postCreateFailure.add(1);
    return null;
  }

  const payload = {
    type: PostType.ANNOUNCEMENT,
    title: `Announcement ${uniqueId}`,
    content: `This is a test announcement created during performance testing. ID: ${uniqueId}`,
    attachments: [],
    isPinned: false,
    commentsEnabled: true,
  };

  const startTime = Date.now();

  const res = client.post(`/api/v1/classrooms/${classroomId}/posts/`, payload, {
    tags: { endpoint: 'posts_create', task: 'createSimplePost' },
  });

  postCreateDuration.add(Date.now() - startTime);

  const success = check(res, {
    'post created': (r) => r.status === 200 || r.status === 201,
  });

  if (success) {
    postCreateSuccess.add(1);
    try {
      const body = JSON.parse(res.body);
      if (body.id) {
        context.postId = body.id;
      }
    } catch (e) {
      // Ignore
    }
  } else {
    postCreateFailure.add(1);
    console.error(`[createSimplePost] Failed: ${res.status}`);
  }

  return res;
}

/**
 * Create a post with file attachment (2-step process)
 *
 * Step 1: Upload file via POST /classrooms/:id/posts/upload
 * Step 2: Create post with attachment from upload response
 *
 * @param {Object} client - HTTP client with auth (teacher)
 * @param {Object} context - Must contain: classroomId, uniqueId, fileData (binary)
 * @returns {Object} - Response with created post
 */
export function createPostWithAttachment(client, context) {
  const { classroomId, uniqueId, fileData, fileName } = context;

  if (!classroomId) {
    console.error('[createPostWithAttachment] Missing classroomId in context');
    postCreateFailure.add(1);
    return null;
  }

  if (!fileData) {
    console.error('[createPostWithAttachment] Missing fileData in context');
    postCreateFailure.add(1);
    return null;
  }

  const startTime = Date.now();

  // Step 1: Upload the file
  const uploadRes = client.upload(
    `/api/v1/classrooms/${classroomId}/posts/upload`,
    {
      file: http.file(fileData, fileName || 'sample.pdf', 'application/pdf'),
    },
    {
      tags: { endpoint: 'posts_upload', task: 'createPostWithAttachment' },
    },
  );

  if (uploadRes.status !== 200 && uploadRes.status !== 201) {
    console.error(
      `[createPostWithAttachment] Upload failed: ${uploadRes.status}`,
    );
    postCreateFailure.add(1);
    return uploadRes;
  }

  // Parse upload response to get attachment info
  let attachment;
  try {
    attachment = JSON.parse(uploadRes.body);
  } catch (e) {
    console.error('[createPostWithAttachment] Failed to parse upload response');
    postCreateFailure.add(1);
    return uploadRes;
  }

  // Step 2: Create post with attachment
  const payload = {
    type: PostType.MATERIAL,
    title: `Course Material ${uniqueId}`,
    content: `This material includes an attachment. Performance test ID: ${uniqueId}`,
    attachments: [attachment],
    isPinned: false,
    commentsEnabled: true,
  };

  const postRes = client.post(
    `/api/v1/classrooms/${classroomId}/posts/`,
    payload,
    {
      tags: { endpoint: 'posts_create', task: 'createPostWithAttachment' },
    },
  );

  postWithAttachmentDuration.add(Date.now() - startTime);

  const success = check(postRes, {
    'post with attachment created': (r) => r.status === 200 || r.status === 201,
  });

  if (success) {
    postCreateSuccess.add(1);
  } else {
    postCreateFailure.add(1);
    console.error(
      `[createPostWithAttachment] Post creation failed: ${postRes.status}`,
    );
  }

  return postRes;
}

/**
 * Create an assignment post
 *
 * @param {Object} client - HTTP client with auth (teacher)
 * @param {Object} context - Must contain: classroomId, uniqueId
 * @returns {Object} - Response with created assignment
 */
export function createAssignment(client, context) {
  const { classroomId, uniqueId } = context;

  if (!classroomId) {
    console.error('[createAssignment] Missing classroomId in context');
    postCreateFailure.add(1);
    return null;
  }

  // Due date 7 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const payload = {
    type: PostType.ASSIGNMENT,
    title: `Assignment ${uniqueId}`,
    content: `Complete this assignment by the due date. Performance test ID: ${uniqueId}`,
    attachments: [],
    isPinned: false,
    commentsEnabled: true,
    assignmentData: {
      dueDate: dueDate.toISOString(),
      points: 100,
      allowLateSubmission: true,
      submissionType: 'file',
    },
  };

  const startTime = Date.now();

  const res = client.post(`/api/v1/classrooms/${classroomId}/posts/`, payload, {
    tags: { endpoint: 'posts_create', task: 'createAssignment' },
  });

  postCreateDuration.add(Date.now() - startTime);

  const success = check(res, {
    'assignment created': (r) => r.status === 200 || r.status === 201,
  });

  if (success) {
    postCreateSuccess.add(1);
  } else {
    postCreateFailure.add(1);
  }

  return res;
}

/**
 * Get a specific post
 *
 * @param {Object} client - HTTP client with auth
 * @param {Object} context - Must contain: classroomId, postId
 * @returns {Object} - Response with post details
 */
export function getPost(client, context) {
  const { classroomId, postId } = context;

  if (!classroomId || !postId) {
    console.error('[getPost] Missing classroomId or postId in context');
    return null;
  }

  const res = client.get(`/api/v1/classrooms/${classroomId}/posts/${postId}`, {
    tags: { endpoint: 'posts_get', task: 'getPost' },
  });

  check(res, {
    'post retrieved': (r) => r.status === 200,
  });

  return res;
}
