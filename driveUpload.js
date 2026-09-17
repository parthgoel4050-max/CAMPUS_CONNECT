import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the JSON key you downloaded from the Google Cloud Keys tab.
// This project uses the service-account-key.json file in the root folder.
const KEY_FILE = path.join(__dirname, 'service-account-key.json');

// Folder ID shared with the service account. Keep this exact value from the Drive folder URL.
const FOLDER_ID = '1v3knqEd5z9Jtkb_M_TwTosWwe9zK_ier';

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

export async function uploadFile(filePath, fileName) {
  try {
    const res = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [FOLDER_ID],
      },
      media: {
        body: fs.createReadStream(filePath),
      },
      fields: 'id, name, webViewLink',
    });

    console.log('Uploaded successfully!');
    console.log('File ID:', res.data.id);
    console.log('View link:', res.data.webViewLink);
    return res.data;
  } catch (err) {
    console.error('Upload failed:', err.message);
    if (err.response && err.response.data) {
      console.error('Google API details:', JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}

const isDirectRun = () => {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
};

if (isDirectRun()) {
  const testFilePath = path.join(__dirname, 'test-upload.txt');
  fs.writeFileSync(testFilePath, 'Hello from my app!');
  console.log('Starting Drive upload test...');

  uploadFile(testFilePath, 'test-upload.txt')
    .then(() => console.log('Done. Check your shared Drive folder.'))
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

