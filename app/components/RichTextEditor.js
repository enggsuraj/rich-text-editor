'use client';

import { useState, useEffect, useRef } from 'react';
import 'quill/dist/quill.snow.css';

const RichTextEditor = () => {
  const [value, setValue] = useState('');
  const [deltaValue, setDeltaValue] = useState('');
  const [submittedCards, setSubmittedCards] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  // Function to upload image to server
  const uploadImageToServer = async (file) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', file);

      // Upload to server endpoint (you'll need to create this endpoint)
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.imageUrl; // Server should return the image URL
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Function to upload files to server
  const uploadFileToServer = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.fileUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Function to resize image before upload
  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to target dimensions
        canvas.width = 300;
        canvas.height = 200;
        
        // Calculate scaling to maintain aspect ratio
        const scale = Math.min(300 / img.width, 200 / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        
        // Center the image on canvas
        const x = (300 - scaledWidth) / 2;
        const y = (200 - scaledHeight) / 2;
        
        // Draw resized image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          // Create a new file from the blob
          const resizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        }, 'image/jpeg', 0.8);
      };
      
      // Load image from file
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Function to handle file upload
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      try {
        // Show loading state
        const loadingFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'uploading',
          progress: 0
        };
        setUploadedFiles(prev => [...prev, loadingFile]);

        // Upload file to server
        const fileUrl = await uploadFileToServer(file);

        // Update file status
        setUploadedFiles(prev => prev.map(f => 
          f.id === loadingFile.id 
            ? { ...f, status: 'uploaded', url: fileUrl, progress: 100 }
            : f
        ));

        // Insert file link into editor
        if (quillRef.current) {
          const range = quillRef.current.getSelection();
          const fileLink = `📎 ${file.name}`;
          
          // If no selection, insert at the end of the document
          const insertIndex = range ? range.index : quillRef.current.getLength();
          
          quillRef.current.insertText(insertIndex, fileLink + '\n', 'link', true);
          quillRef.current.insertEmbed(insertIndex + fileLink.length, 'link', fileUrl);
        }

      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadedFiles(prev => prev.map(f => 
          f.id === loadingFile.id 
            ? { ...f, status: 'error', error: error.message }
            : f
        ));
      }
    }
  };

  // Function to get file icon based on type
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('json')) return '📋';
    if (fileType.includes('yaml') || fileType.includes('yml')) return '⚙️';
    if (fileType.includes('xml')) return '📄';
    if (fileType.includes('csv') || fileType.includes('tsv')) return '📊';
    if (fileType.includes('excel')) return '📊';
    if (fileType.includes('text')) return '📝';
    if (fileType.includes('word')) return '📄';
    if (fileType.includes('powerpoint')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📎';
  };

  // Function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Function to handle send button click
  const handleSend = () => {
    if (value.trim()) {
      const newCard = {
        id: Date.now(),
        html: value,
        delta: deltaValue,
        timestamp: new Date().toLocaleString(),
      };
      setSubmittedCards(prev => [newCard, ...prev]);
      
      // Clear the editor
      if (quillRef.current) {
        quillRef.current.setText('');
      }
      setValue('');
      setDeltaValue('');
      
      // Clear all uploaded files
      setUploadedFiles([]);
    }
  };

  // Function to handle edit button click
  const handleEdit = (card) => {
    if (quillRef.current) {
      // Clear current content
      quillRef.current.setText('');
      
      // Load the card's content into the editor
      try {
        const deltaContent = JSON.parse(card.delta);
        quillRef.current.setContents(deltaContent);
        
        // Update the state to reflect the loaded content
        const content = quillRef.current.root.innerHTML;
        setValue(content);
        setDeltaValue(card.delta);
        
        // Scroll to editor
        editorRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Error loading content for editing:', error);
        // Fallback: load HTML content
        quillRef.current.root.innerHTML = card.html;
        setValue(card.html);
        setDeltaValue(card.delta);
      }
    }
  };

  useEffect(() => {
    let Quill;
    
    const initQuill = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const quillModule = await import('quill');
        Quill = quillModule.default;
        
        if (editorRef.current && !quillRef.current) {
          const quill = new Quill(editorRef.current, {
            theme: 'snow',
            modules: {
              toolbar: {
                container: [
                  [{ 'header': [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  [{ 'color': [] }, { 'background': [] }],
                  [{ 'align': [] }],
                  ['link', 'image'],
                  ['clean']
                ],
                handlers: {
                  image: async () => {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.click();

                    input.onchange = async () => {
                      const file = input.files[0];
                      if (file && quillRef.current) {
                        try {
                          // Show loading state (optional)
                          const range = quillRef.current.getSelection();
                          quillRef.current.insertText(range.index, 'Uploading image...', 'bold', true);
                          
                          // Resize image
                          const resizedFile = await resizeImage(file);
                          
                          // Upload to server
                          const imageUrl = await uploadImageToServer(resizedFile);
                          
                          // Remove loading text and insert image
                          quillRef.current.deleteText(range.index, 'Uploading image...'.length);
                          quillRef.current.insertEmbed(range.index, 'image', imageUrl);
                          
                        } catch (error) {
                          console.error('Error handling image:', error);
                          // Remove loading text on error
                          const range = quillRef.current.getSelection();
                          quillRef.current.deleteText(range.index, 'Uploading image...'.length);
                          alert('Failed to upload image. Please try again.');
                        }
                      }
                    };
                  }
                }
              },
            },
            formats: [
              'header',
              'bold', 'italic', 'underline', 'strike',
              'list',
              'color', 'background',
              'align',
              'link', 'image'
            ],
            placeholder: 'Start writing your content here...'
          });

          // Set up text change handler
          quill.on('text-change', (delta, oldDelta, source) => {
            const content = quill.root.innerHTML;
            const deltaContent = quill.getContents();
            setValue(content);
            setDeltaValue(JSON.stringify(deltaContent, null, 2));
            console.log('Editor content:', content);
            console.log('Delta content:', deltaContent);
          });

          // Store quill instance in ref
          quillRef.current = quill;
        }
      } catch (error) {
        console.error('Error initializing Quill:', error);
      }
    };

    initQuill();

    // Cleanup function
    return () => {
      if (quillRef.current) {
        // Clean up if needed
        quillRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rich-text-editor">
      <h2>Rich Text Editor</h2>
      
      {/* File Upload Section */}
      <div className="file-upload-section">
        <h3>File Upload</h3>
        <div className="file-upload-container">
          <input
            type="file"
            multiple
            accept=".json,.yaml,.yml,.xml,.csv,.tsv,.txt,.png,.jpeg,.jpg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
            onChange={handleFileUpload}
            id="file-upload"
            className="file-input"
          />
          <label htmlFor="file-upload" className="file-upload-label">
            Choose Files (JSON, YAML, XML, CSV, TSV, TXT, Images, PDF, etc.)
          </label>
        </div>
        
        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="uploaded-files">
            <h4>Uploaded Files ({uploadedFiles.length})</h4>
            <div className="files-list">
              {uploadedFiles.map((file) => (
                <div key={file.id} className={`file-item ${file.status}`}>
                  <div className="file-info">
                    <span className="file-icon">{getFileIcon(file.type)}</span>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    {file.status === 'uploading' && (
                      <div className="upload-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${file.progress}%` }}
                          ></div>
                        </div>
                        <span>{file.progress}%</span>
                      </div>
                    )}
                    {file.status === 'uploaded' && (
                      <>
                        <button 
                          onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                          className="delete-file-btn"
                        >
                          x
                        </button>
                      </>
                    )}
                    {file.status === 'error' && (
                      <span className="error-message">❌ {file.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="editor-container">
        <div ref={editorRef} style={{ height: '300px' }}></div>
        <div className="send-button-container">
          <button 
            className="send-button"
            onClick={handleSend}
            disabled={!value.trim()}
          >
            Send
          </button>
        </div>
      </div>
      <div className="content-preview">
        <h3>Content Preview:</h3>
        <div 
          className="preview-content"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </div>
      <div className="html-output">
        <h3>Generated HTML:</h3>
        <pre className="html-code">
          {value || '<p>No content yet. Start typing in the editor above!</p>'}
        </pre>
      </div>
      <div className="delta-output">
        <h3>Delta Format:</h3>
        <pre className="delta-code">
          {deltaValue || '{"ops":[]}'}
        </pre>
      </div>
      
      {/* Submitted Cards Section */}
      {submittedCards.length > 0 && (
        <div className="submitted-cards">
          <h3>Submitted Content ({submittedCards.length})</h3>
          <div className="cards-container">
            {submittedCards.map((card) => (
              <div key={card.id} className="content-card">
                <div className="card-header">
                  <span className="card-timestamp">{card.timestamp}</span>
                  <div className="card-actions">
                    <button 
                      className="edit-card-btn"
                      onClick={() => handleEdit(card)}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="delete-card-btn"
                      onClick={() => setSubmittedCards(prev => prev.filter(c => c.id !== card.id))}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="card-content">
                  <div 
                    className="card-html"
                    dangerouslySetInnerHTML={{ __html: card.html }}
                  />
                </div>
                <div className="card-footer">
                  <details className="card-details">
                    <summary>View HTML</summary>
                    <pre className="card-html-code">{card.html}</pre>
                  </details>
                  <details className="card-details">
                    <summary>View Delta</summary>
                    <pre className="card-delta-code">{card.delta}</pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
