// ThinkTechErpAPI's file storage (Areas/Security/Controller/FileStorageController.cs, /api/files): files a
// record links to, stored per organization and readable without sign-in at their url.

/** The folders a file can be stored in: for product.image_url, organization.logo_url and User.photoUrl. */
export const FILE_FOLDERS = ["product", "organization", "user"] as const;
export type FileFolder = (typeof FILE_FOLDERS)[number];

/** Image types the API accepts (its FileStorage:AllowedExtensions also has documents). */
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];
export const IMAGE_ACCEPT = IMAGE_EXTENSIONS.join(",");

/** FileStorage:MaxFileSizeMb, and the 10 MB a request through the proxy is buffered up to. */
export const MAX_UPLOAD_MB = 10;

export type StoredFile = {
  /** {organization slug}/{folder}/{file name}. */
  path: string;
  /** Where the file is read from: save it in the record's column. */
  url: string;
  organizationSlug: string;
  folder: FileFolder;
  fileName: string;
  size: number;
  contentType: string;
  lastModified: string;
};
