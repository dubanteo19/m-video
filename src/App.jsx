import React, { useEffect, useRef, useState } from 'react';
import { FileUploader } from './components/file-uploader';
import { FullScreenLoader } from './components/loader';
import { EyeIcon, FolderIcon, GlobeIcon, UploadIcon } from './components/icons';
import { VideoItem } from './components/video-item';
const pathParts = window.location.pathname.split('/').filter(Boolean);
const queryParams = new URLSearchParams(window.location.search);
const isUploader = queryParams.get('uploader') === 'true';
const userName = pathParts[0] || 'public'; // Default to 'public' if URL is just /
const API = `http://${window.location.hostname}:5000`;

export default function App() {
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasLoadedInitially = useRef(false);
  const [highlightedFile, setHighlightedFile] = useState(null);
  const updateVideoList = async () => {
    try {
      const res = await fetch(`${API}/list/${userName}`);
      const data = await res.json();
      setVideos(data);
      if (data.length > 0) {
        if (!hasLoadedInitially.current) {
          setSelected(data[0]);
          hasLoadedInitially.current = true;
        }
      } else {
        setSelected(null);
      }
      return data;
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  const handleNewUploadSelection = async () => {
    const latestData = await updateVideoList();
    if (latestData && latestData.length > 0) {
      setSelected(latestData[0]);
    }
  };

  // 3. The Interval (Background Sync)
  useEffect(() => {
    updateVideoList();
    const interval = setInterval(updateVideoList, 3000);
    return () => clearInterval(interval);
  }, []);

  // 4. The Upload Logic
  const uploadFiles = async (files) => {
    if (!validateFiles(files)) return;
    setIsUploading(true); // Show loader
    const fd = new FormData();
    for (let f of files) fd.append('videos', f);

    try {
      const res = await fetch(`${API}/upload/${userName}`, {
        method: 'POST',
        body: fd
      });
      const result = await res.json();
      if (res.status === 409) {
        console.log(result.duplicatedFile);
        triggerHighlight(result.duplicatedFile);
      } else if (!res.ok) {
        alert(result.message || "Upload failed");
      } else {
        handleNewUploadSelection();
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed. Please try again.");
    }
    finally {
      setIsUploading(false); // Hide loader
    }
  };

  const validateFiles = (files) => {
    if (!files || files.length === 0) return;
    // Validate the number of files
    if ((files.length > 5)) {
      alert('You can only upload up to 5 files at a time');
      return false;
    }
    
    // Validate the file size
    for (let f of files) {
      if (f.size > 1024 * 1024 * 100) {
        alert('File size exceeds 100MB');
        return false;
      }
    }
    return true;
  };

  const onClear = async () => {
    const confirm = window.confirm('Are you sure you want to clear the folder?');
    if (!confirm) return;
    try {
      await fetch(`${API}/clear/${userName}`, { method: 'DELETE' });
      setSelected(null);
      updateVideoList();
    } catch (err) {
      console.error("Clear failed", err);
    }
  };

  const onShareLink = () => {
    const urlToCopy = `${window.location.origin}/${userName}`;

    const textArea = document.createElement("textarea");
    textArea.value = urlToCopy;

    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) setCopied(true);
    } catch (err) {
      console.error("Fallback copy failed", err);
    }

    document.body.removeChild(textArea);
  };
  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  }, [copied]);
  const onDeleteVideo = async (filename) => {
    const confirm = window.confirm(`Delete "${filename}"?`);
    if (!confirm) return;
    try {
      const res = await fetch(`${API}/delete-video/${userName}/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (selected === filename) setSelected(null);
        updateVideoList(); // Refresh the list
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };
  const triggerHighlight = (name) => {
    setHighlightedFile(name);
    setTimeout(() => setHighlightedFile(null), 2000);
  };
  const handleSelectFolder = () => {
    const folderName = window.prompt("Enter the folder name");
    if (folderName && folderName.trim() !== "") {
      const newUrl = new URL(window.location.href);
      newUrl.pathname = `/${folderName.trim()}`;
      newUrl.searchParams.set('uploader', 'true');
      window.location.href = newUrl.toString();
    }
  };
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui', color: '#333' }}>
      {/* LEFT PANEL */}
      <div style={{ width: '300px', borderRight: '2px solid #eee', padding: '20px', background: '#fcfcfc' }}>
        {
          isUploader && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a style={{
                  margin: '0',
                  textDecoration: 'none',
                  color: '#333',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }} href={`/public`}>Upload Panel</a>
                <a style={{
                  background: 'none',
                  border: '1px solid #007bff',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  padding: '0 5px'
                }} href={`/${userName}`}>
                  <EyeIcon color='#007bff' />
                </a>
                <button type='button' onClick={onShareLink} style={
                  {
                    padding: '5px 10px',
                    background: 'none',
                    border: '1px solid red',
                    borderRadius: '5px',
                    color: 'red',
                    fontSize: '0.8rem'
                  }
                }>{copied ? 'Link copied' : 'Share link'}</button>

              </div>
              <div style={{ height: '200px' }}>
                <FileUploader
                  onUploadFiles={uploadFiles}
                />
              </div>
            </>
          )
        }

        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                cursor: 'pointer',
                padding: '0px 4px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }} onClick={handleSelectFolder}>
                <FolderIcon />
              </div>
              <span style={{ color: '#007bff' }}>
                {userName === 'public' ? <GlobeIcon /> : userName}
              </span> videos ({videos.length})
            </div>
            {
              !isUploader && (
                <a href={`/${userName}?uploader=true`}
                  style={{
                    textDecoration: 'none'
                  }}>
                  <UploadIcon />
                </a>
              )

            }
            {
              isUploader && (
                <button onClick={onClear} style={{
                  padding: '5px',
                  background: 'none',
                  border: '1px solid red',
                  color: 'red',
                  borderRadius: '5px'
                }}>
                  Clear
                </button>
              )
            }
          </div>
          {videos.map((v) => (
            <VideoItem
              isHighlighted={highlightedFile === v}
              key={v}
              filename={v}
              isSelected={selected === v}
              isUploader={isUploader}
              onSelect={(name) => setSelected(name)}
              onDelete={(name) => onDeleteVideo(name)}
            />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        {selected ? (
          <video muted autoPlay key={selected} controls style={{ maxWidth: '100%', maxHeight: '100%' }}>
            <source src={`${API}/stream/${userName}/${encodeURIComponent(selected)}`} type="video/mp4" />
          </video>
        ) : (
          <div style={{ padding: '0px 20px', height: '90%', width: '100%' }}>
            <FileUploader onUploadFiles={uploadFiles} />
          </div>
        )}
      </div>
      {isUploading && <FullScreenLoader />}
    </div>
  );
}
