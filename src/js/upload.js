document.addEventListener('DOMContentLoaded', () => {
  const fileUploadArea = document.querySelector('.file-upload-area');
  const fileInput = document.querySelector('.file-input');

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    fileUploadArea.classList.add('drag-over');
  }

  function unhighlight() {
    fileUploadArea.classList.remove('drag-over');
  }

  fileUploadArea.addEventListener('drop', handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    // Create a new DataTransfer object
    const dataTransfer = new DataTransfer();
    
    // Add the dropped files to the new DataTransfer object
    Array.from(files).forEach(file => {
        dataTransfer.items.add(file);
    });
    
    // Assign the files to the input element
    fileInput.files = dataTransfer.files;
    
    // Trigger change event
    const event = new Event('change');
    fileInput.dispatchEvent(event);
  }
}); 