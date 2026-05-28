interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'pad' | 'crop' | 'thumb';
  quality?: 'auto' | 'best';
  fetch_format?: 'auto' | 'webp' | 'jpg' | 'png';
}

class CloudinaryClient {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;
  private uploadPreset: string;

  constructor() {
    this.cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    this.apiKey = process.env.CLOUDINARY_API_KEY || '';
    this.apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    this.uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'printme_designs';
  }

  async uploadImage(
    file: File,
    folder: string = 'printme/designs'
  ): Promise<CloudinaryUploadResponse> {
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name not configured');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', folder);
    formData.append('resource_type', 'auto');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Cloudinary upload failed: ${error.error?.message || 'Unknown error'}`);
      }

      return response.json();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  async uploadImageFromUrl(
    imageUrl: string,
    folder: string = 'printme/designs'
  ): Promise<CloudinaryUploadResponse> {
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name not configured');
    }

    const formData = new FormData();
    formData.append('file', imageUrl);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', folder);
    formData.append('resource_type', 'auto');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Cloudinary upload failed: ${error.error?.message || 'Unknown error'}`);
      }

      return response.json();
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  }

  getTransformUrl(
    publicId: string,
    options: CloudinaryTransformOptions = {}
  ): string {
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name not configured');
    }

    const {
      width = 1000,
      height = 1000,
      crop = 'fill',
      quality = 'auto',
      fetch_format = 'auto',
    } = options;

    const transformations = [
      `w_${width}`,
      `h_${height}`,
      `c_${crop}`,
      `q_${quality}`,
      `f_${fetch_format}`,
    ].join(',');

    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformations}/${publicId}`;
  }

  getMockupUrl(
    productMockupPublicId: string,
    designPublicId: string,
    overlayOptions: { x?: number; y?: number; width?: number; height?: number } = {}
  ): string {
    if (!this.cloudName) {
      throw new Error('Cloudinary cloud name not configured');
    }

    const { x = 50, y = 50, width = 400, height = 400 } = overlayOptions;

    const overlay = `l_${designPublicId},w_${width},h_${height},x_${x},y_${y},fl_layer_apply`;
    const transformations = [
      `w_1000`,
      `h_1000`,
      `c_fill`,
      `q_auto`,
      `f_auto`,
      overlay,
    ].join(',');

    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformations}/${productMockupPublicId}`;
  }

  deleteImage(publicId: string): Promise<void> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Cloudinary API credentials not configured');
    }

    // Note: Deletion requires server-side authentication with API key/secret
    // This would be implemented as a server API route for security
    console.warn('Image deletion should be called from server-side API route');
    return Promise.resolve();
  }
}

export const cloudinaryClient = new CloudinaryClient();
export type { CloudinaryUploadResponse, CloudinaryTransformOptions };
