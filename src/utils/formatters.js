import React from 'react';
import { parseDateTime } from './tracerParser';

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatUploadTime = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatEventTime = (dateTimeStr) => {
  if (!dateTimeStr) return '';
  const date = parseDateTime(dateTimeStr);
  if (!date) return '';
  
  try {
    const datePart = date.toLocaleDateString([], {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    
    const timePart = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const timeZone = 'GMT+1'; // Or use date.getTimezoneOffset() to calculate dynamically
    
    return (
      <>
        {datePart}<br />
        {timePart}<br />
        <span className="timezone">{timeZone}</span>
      </>
    );
  } catch (err) {
    console.error('Error formatting datetime:', dateTimeStr, err);
    return '';
  }
}; 