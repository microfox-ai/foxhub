import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AWS_REGION } from "./aws/aws_helper";

const config = {
  s3Client: new S3({
    forcePathStyle: false,
    endpoint: process.env.SPACES_ENDPOINT,
    region: AWS_REGION.US_EAST_1,
    credentials: {
      accessKeyId: process.env.SPACES_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.SPACES_SECRET_KEY || "",
    },
  }),
  bucket: process.env.SPACES_NAME || "",
  folder: "files",
};

export const s3FileUploadSdk = {
  /**
   * Uploads a file to the specified bucket on digital ocean.
   *
   * @param {Object} params - The parameters for the file upload.
   * @param {any} params.file - The file to be uploaded.
   * @param {string} params.userId - The ID of the user uploading the file.
   * @param {string} params.folder - The folder where the file will be stored.
   * @return {Promise<Object>} A promise that resolves to the response from the S3 upload request.
   */
  uploadFile: async ({
    file,
    userId,
    folder,
    fileInfoWithFileBuffer,
  }: {
    file?: any;
    fileInfoWithFileBuffer?: {
      fileName: string;
      fileType: string;
      fileBuffer: any;
    };
    userId?: string;
    folder?: string;
  }): Promise<PutObjectCommandOutput | undefined> => {
    let key;
    console.log(file);

    if (!userId)
      key = `${folder || config.folder}/${file ? file.name : fileInfoWithFileBuffer?.fileName
        }`;
    else
      key = `${folder || config.folder}/${userId}/${file ? file.name : fileInfoWithFileBuffer?.fileName
        }`;

    try {
      const Body = file
        ? await file.arrayBuffer()
        : fileInfoWithFileBuffer?.fileBuffer;

      let fileName, fileType;
      if (file) {
        fileName = file.name;
        fileType = file.type;
      } else {
        fileName = fileInfoWithFileBuffer?.fileName;
        fileType = fileInfoWithFileBuffer?.fileType;
      }
      const res = await config.s3Client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: file ? Buffer.from(Body) : Body,
          ACL: "public-read",
          ContentEncoding: undefined,
          ContentType: fileType,
          BucketKeyEnabled: true,
          Metadata: {
            name: fileName,
            type: fileType,
          },
        }),
      );
      return res;
    } catch (error) {
      console.log(error);
    }
  },
  downloadFile: async ({
    userId,
    fileName,
    folder,
  }: {
    userId?: string;
    fileName: any;
    folder?: string;
  }): Promise<GetObjectCommandOutput | undefined> => {
    let key;
    if (!userId) key = `${folder || config.folder}/${fileName}`;
    else key = `${folder || config.folder}/${userId}/${fileName}`;
    try {
      const res = await config.s3Client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
      );
      return res;
    } catch (error) {
      console.log(error);
    }
  },
  streamToBuffer: (stream: any) => {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on("data", (chunk: any) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  },

  getPublicFileUrl: ({
    userId,
    file,
    folder,
  }: {
    userId?: string;
    file: any;
    folder?: string;
  }): string => {
    return userId
      ? ` https://${process.env.SPACES_NAME}.nyc3.cdn.digitaloceanspaces.com/${folder || config.folder
      }/${userId}/${encodeURI(file.name || file.fileName)}`
      : `https://${process.env.SPACES_NAME}.nyc3.cdn.digitaloceanspaces.com/${folder || config.folder
      }/${encodeURI(file.name || file.fileName)}`;
  },
  /**
   * Retrieves the private signed URL good for 24 hrs of the file associated with the provided key.
   *
   * @param {string} key - The key used to identify the file.
   * @return {Promise<string | undefined>} The URL of the file if found, otherwise undefined.
   */

  getPrivateFileUrl: async ({
    userId,
    file,
    folder,
  }: {
    userId?: string;
    file: any;
    folder?: string;
  }): Promise<string | undefined> => {
    let key;
    if (!userId) key = `${folder || config.folder}/${file.name}`;
    else key = `${folder || config.folder}/${userId}/${file.name}`;
    try {
      const url = await getSignedUrl(
        config.s3Client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: 3600 * 24 },
      );
      return url;
    } catch (error) {
      console.log(error);
    }
  },

  /**
   * Deletes a file from the specified bucket on digital ocean.
   *
   * @param {Object} params - The parameters for the file deletion.
   * @param {string} params.userId - The ID of the user who owns the file.
   * @param {string} params.fileName - The name of the file to be deleted.
   * @return {Promise<Object>} A promise that resolves to the response from the S3 delete request.
   */

  deleteFile: async ({
    userId,
    fileName,
    folder,
  }: {
    fileName: string;
    userId?: string;
    folder?: string;
  }): Promise<DeleteObjectCommandOutput | undefined> => {
    let key;
    if (!userId) key = `${folder || config.folder}/${fileName}`;
    else key = `${folder || config.folder}/${userId}/${fileName}`;
    try {
      const res = await config.s3Client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
      );
      return res;
    } catch (error) {
      console.log(error);
    }
  },
};
