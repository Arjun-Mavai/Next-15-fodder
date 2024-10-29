// Single image upload function
 const uploadSingleImage = async (file: File, supabase: any, bucketName = 'images') => {
    try {
      // Create unique filename
      const filename = `${Date.now()}-${file.name}`;
      
      // Upload to supabase storage
      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(filename, file);
        
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filename);
        
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
  
  // Multiple images upload function 
  const uploadMultipleImages = async (files: File[], supabase: any, bucketName = 'images') => {
    try {
      // Upload all images and get URLs
      const uploadPromises = files.map(file => uploadSingleImage(file, supabase, bucketName));
      const urls = await Promise.all(uploadPromises);
      
      return urls;
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      throw error;
    }
  }
  
  export { uploadSingleImage, uploadMultipleImages };