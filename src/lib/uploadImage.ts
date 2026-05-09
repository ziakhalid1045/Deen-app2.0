/// <reference types="vite/client" />
export const uploadImage = async (file: File): Promise<string> => {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_IMGBB_API_KEY is missing in environment variables. Please get a free API key from https://api.imgbb.com/ and add it to the Secrets panel.");
  }

  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Image upload failed");
  }
  
  const data = await response.json();
  return data.data.url;
};
