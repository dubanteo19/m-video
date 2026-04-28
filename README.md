# m-video

Simple local app to **upload, list, and watch** shared videos. Each path (e.g. `/myname`) is its own collection. **React + Vite** front end, **Express** API. Use `?uploader=true` for the upload screen.


https://github.com/user-attachments/assets/f76c3a14-94b7-44d1-a14c-cfe75428ee30

## Features

- **Upload** — Drag-and-drop or file picker; sends videos to the API for the current user.
- **View** — Browse the list and play selected videos in the player; streams from the server.
- **Workspace** — Each URL segment (e.g. `/username`) is its own folder of videos on disk.
- **Duplicate check** — Uploading a file that already exists for that user is rejected; the API returns 409 and the UI can surface the conflict.
- **Size validation** — 100MB max per file (enforced in the client and on the server).
- **Separate uploader and viewer** — Add `?uploader=true` for the upload layout; open without it for the watch/browse experience.
- **Multiple upload** — Select or drop many video files at once; the file input uses `multiple` and uploads are sent together.

## Requirements

- **Node.js** 18 or newer
- **npm**

## Setup

```bash
git clone https://github.com/dubanteo19/m-video.git
cd m-video
npm install
npm start
```

This runs the API on **port 5000** and the Vite dev server on **port 5002**. Open the URL Vite prints in the terminal.

## License

ISC
