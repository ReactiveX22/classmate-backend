/**
 * Upload Task Module
 *
 * Dedicated file upload and download task functions.
 * Used for stress testing file operations.
 */

import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import http from 'k6/http';

// Metrics
const uploadDuration = new Trend('task_upload_duration', true);
const downloadDuration = new Trend('task_download_duration', true);
const uploadSuccess = new Counter('task_upload_success');
const uploadFailure = new Counter('task_upload_failure');
const downloadSuccess = new Counter('task_download_success');
const downloadFailure = new Counter('task_download_failure');

/**
 * Upload a file to a classroom
 *
 * @param {Object} client - HTTP client with auth (teacher)
 * @param {Object} context - Must contain: classroomId, fileData (binary), fileName
 * @returns {Object} - Response with uploaded file info
 */
export function uploadFile(client, context) {
  const { classroomId, fileData, fileName } = context;

  if (!classroomId) {
    console.error('[uploadFile] Missing classroomId in context');
    uploadFailure.add(1);
    return null;
  }

  if (!fileData) {
    console.error('[uploadFile] Missing fileData in context');
    uploadFailure.add(1);
    return null;
  }

  const startTime = Date.now();

  const res = client.upload(
    `/api/v1/classrooms/${classroomId}/posts/upload`,
    {
      file: http.file(fileData, fileName || 'sample.pdf', 'application/pdf'),
    },
    {
      tags: { endpoint: 'upload', task: 'uploadFile' },
    },
  );

  uploadDuration.add(Date.now() - startTime);

  const success = check(res, {
    'file uploaded': (r) => r.status === 200 || r.status === 201,
  });

  if (success) {
    uploadSuccess.add(1);
  } else {
    uploadFailure.add(1);
    console.error(`[uploadFile] Failed: ${res.status}`);
  }

  return res;
}

/**
 * Download/view a file from a classroom
 *
 * @param {Object} client - HTTP client with auth (member)
 * @param {Object} context - Must contain: classroomId, fileName
 * @returns {Object} - Response with file content
 */
export function downloadFile(client, context) {
  const { classroomId, fileName } = context;

  if (!classroomId || !fileName) {
    console.error('[downloadFile] Missing classroomId or fileName in context');
    downloadFailure.add(1);
    return null;
  }

  const startTime = Date.now();

  const res = client.get(
    `/api/v1/uploads/classroom-attachments/${classroomId}/${fileName}`,
    {
      tags: { endpoint: 'download', task: 'downloadFile' },
    },
  );

  downloadDuration.add(Date.now() - startTime);

  const success = check(res, {
    'file downloaded': (r) => r.status === 200,
  });

  if (success) {
    downloadSuccess.add(1);
  } else {
    downloadFailure.add(1);
    // Don't log every failure as files may not exist during tests
  }

  return res;
}

/**
 * Stress upload - upload, then immediately delete
 * Useful for testing upload throughput without filling storage
 *
 * @param {Object} client - HTTP client with auth (teacher)
 * @param {Object} context - Must contain: classroomId, fileData, fileName
 * @returns {Object} - Final response
 */
export function uploadAndDelete(client, context) {
  const { classroomId, fileData, fileName } = context;

  if (!classroomId || !fileData) {
    console.error('[uploadAndDelete] Missing required context');
    uploadFailure.add(1);
    return null;
  }

  const startTime = Date.now();

  // Upload file
  const uploadRes = client.upload(
    `/api/v1/classrooms/${classroomId}/posts/upload`,
    {
      file: http.file(fileData, fileName || 'sample.pdf', 'application/pdf'),
    },
    {
      tags: { endpoint: 'upload', task: 'uploadAndDelete' },
    },
  );

  if (uploadRes.status !== 200 && uploadRes.status !== 201) {
    uploadFailure.add(1);
    return uploadRes;
  }

  // Parse response to get attachment ID
  let attachmentId;
  try {
    const attachment = JSON.parse(uploadRes.body);
    attachmentId = attachment.id;
  } catch (e) {
    console.error('[uploadAndDelete] Failed to parse upload response');
    uploadFailure.add(1);
    return uploadRes;
  }

  // Delete the uploaded file
  const deleteRes = client.delete(
    `/api/v1/classrooms/${classroomId}/posts/upload/${attachmentId}`,
    {
      tags: { endpoint: 'upload_delete', task: 'uploadAndDelete' },
    },
  );

  uploadDuration.add(Date.now() - startTime);

  const success = check(deleteRes, {
    'file deleted after upload': (r) => r.status === 204 || r.status === 200,
  });

  if (success) {
    uploadSuccess.add(1);
  } else {
    uploadFailure.add(1);
  }

  return deleteRes;
}

/**
 * Batch upload - upload multiple files in sequence
 * For testing sustained upload load
 *
 * @param {Object} client - HTTP client with auth (teacher)
 * @param {Object} context - Must contain: classroomId, fileData, fileName, count
 * @returns {Array} - Array of responses
 */
export function batchUpload(client, context) {
  const { classroomId, fileData, fileName, count = 3 } = context;

  if (!classroomId || !fileData) {
    console.error('[batchUpload] Missing required context');
    return [];
  }

  const responses = [];
  const startTime = Date.now();

  for (let i = 0; i < count; i++) {
    const batchFileName = `${i + 1}_${fileName || 'sample.pdf'}`;

    const res = client.upload(
      `/api/v1/classrooms/${classroomId}/posts/upload`,
      {
        file: http.file(fileData, batchFileName, 'application/pdf'),
      },
      {
        tags: { endpoint: 'upload', task: 'batchUpload' },
      },
    );

    responses.push(res);

    const success = res.status === 200 || res.status === 201;
    if (success) {
      uploadSuccess.add(1);
    } else {
      uploadFailure.add(1);
    }
  }

  uploadDuration.add(Date.now() - startTime);

  return responses;
}
