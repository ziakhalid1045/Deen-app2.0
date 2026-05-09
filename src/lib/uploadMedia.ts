import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export const uploadMedia = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Determine folder based on type
    const folder = file.type.startsWith('video/') ? 'videos' : 'images';
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};
