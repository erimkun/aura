import { FaceMesh } from "@mediapipe/face_mesh";

export const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  },
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

export const checkForeheadClear = (landmarks: any) => {
  // Forehead landmarks are roughly indices around 10, 151, 9
  // This is a simplified check for demo purposes
  // A real check would involve logic to see if the region between top of eyebrows and hairline is occluded
  if (!landmarks) return false;
  
  // Just a placeholder for the logic mentioned in the plan: 
  // "MediaPipe Face Mesh kullanarak alındaki landmark noktalarını takip et."
  return true; 
};
