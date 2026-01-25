import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
} from '@nestjs/common';

export function UploadAttachment() {
  return UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({
          maxSize: 10 * 1024 * 1024,
          message: 'File is too large. Maximum size is 10MB',
        }),
        new FileTypeValidator({
          fileType:
            /(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip)$/,
        }),
      ],
    }),
  );
}
