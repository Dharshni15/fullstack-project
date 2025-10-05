import app from "./app.js";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // CLOUDINARY_CLIENT_NAME
  api_key: process.env.CLOUDINARY_API_KEY,       // CLOUDINARY_CLIENT_API
  api_secret: process.env.CLOUDINARY_API_SECRET, // CLOUDINARY_CLIENT_SECRET
});

const PORT = process.env.PORT || 5002;
const server = app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});

// Handle EADDRINUSE error gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process or use a different port.`);
    process.exit(1);
  } else {
    throw err;
  }
});
