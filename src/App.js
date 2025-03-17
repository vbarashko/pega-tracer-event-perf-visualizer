import React from 'react';
import { useState, useEffect } from 'react';
import './styles/index.css';
import { parseTracerData } from './utils/tracerParser';
import { formatFileSize, formatUploadTime, formatEventTime } from './utils/formatters';

function App() {
  const [profileData, setProfileData] = useState([]);
  const [tracerContent, setTracerContent] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hideMinorEvents, setHideMinorEvents] = useState(false);
  const [significanceThreshold, setSignificanceThreshold] = useState(3);
  const [filesUploaded, setFilesUploaded] = useState({
    tracer: false
  });
  const [uploadTime, setUploadTime] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  
  const handleFileUpload = (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setUploadTime(new Date());

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const hierarchyData = parseTracerData(e.target.result);
        setProfileData(hierarchyData);
        setTracerContent(e.target.result);
        setFilesUploaded(prev => ({ ...prev, tracer: true }));
      } catch (err) {
        console.error(`Error parsing ${fileType} file:`, err);
        setError(`Error parsing ${fileType} file: ` + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError(`Error reading ${fileType} file`);
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  const rootTotalDuration = profileData.reduce((sum, node) => sum + (node.duration || 0), 0);
  const hiddenRootNodes = profileData.filter(node => {
    const percentage = rootTotalDuration > 0 ? (node.duration / rootTotalDuration) * 100 : 0;
    return percentage < significanceThreshold;
  });

  const visibleProfileData = hideMinorEvents 
    ? profileData.filter(node => {
        const percentage = rootTotalDuration > 0 ? (node.duration / rootTotalDuration) * 100 : 0;
        return percentage >= significanceThreshold;
      })
    : profileData;

  const collapseAllNodes = () => {
    setExpandedNodes(new Set());
  };

  const expandTopDurationNodes = () => {
    const newExpandedNodes = new Set();
    
    // Find root node with max duration
    const maxRootNode = profileData.reduce((max, node) => 
      (node.duration > (max?.duration || 0)) ? node : max
    , null);

    if (maxRootNode) {
      // Process the max duration root node
      const processNode = (currentNode) => {
        if (!currentNode.children?.length) return;
        
        // Find the child with max duration
        const maxChild = currentNode.children.reduce((max, child) => 
          (child.duration > (max?.duration || 0)) ? child : max
        , null);
        
        if (maxChild) {
          newExpandedNodes.add(maxChild.startSequence);
          processNode(maxChild);
        }
      };
      
      // Start with max duration root node
      newExpandedNodes.add(maxRootNode.startSequence);
      processNode(maxRootNode);
    }
    
    setExpandedNodes(newExpandedNodes);
  };

  // Add clearResults function
  const clearResults = () => {
    setProfileData([]);
    setTracerContent(null);
    setError(null);
    setIsLoading(false);
    setFilesUploaded({ tracer: false });
    setUploadTime(null);
    setExpandedNodes(new Set());
    setHideMinorEvents(false);
  };

  return (
    <>
      {/* Only show sidebar if profileData has items */}
      {profileData.length > 0 && (
        <div className="sidebar">
          <div className="sidebar-header">
            Visualization Controls
          </div>
          <div className="sidebar-section">
            <div className="sidebar-section-title">File</div>
            <div className="sidebar-buttons">
              <button 
                className="btn btn-danger"
                onClick={clearResults}
              >
                <span role="img" aria-label="delete">🗑️</span> Clear Results
              </button>
            </div>
            {tracerContent && (
              <div className="file-metadata">
                <div className="metadata-item">
                  <span className="metadata-label">Interactions:</span>
                  <span className="metadata-value">{profileData.length}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Size:</span>
                  <span className="metadata-value">{formatFileSize(tracerContent.length)}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Uploaded:</span>
                  <span className="metadata-value">{formatUploadTime(uploadTime)}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Last Event:</span>
                  <span className="metadata-value">
                    {formatEventTime(profileData[profileData.length - 1]?.rawDateTime)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="sidebar-section">
            <div className="sidebar-section-title">Tree Controls</div>
            <div className="sidebar-buttons">
              <button 
                className="btn"
                onClick={collapseAllNodes}
              >
                <span className="btn-icon">▼</span> Collapse All Nodes
              </button>
              <button 
                className="btn"
                onClick={expandTopDurationNodes}
              >
                <span role="img" aria-label="expand">▶</span> Expand Top Duration Paths
              </button>
            </div>
          </div>
          
          <div className="sidebar-section">
            <div className="sidebar-section-title">Display Options</div>
            <div className="threshold-control">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={hideMinorEvents}
                  onChange={(e) => setHideMinorEvents(e.target.checked)}
                />
                Show only significant events
              </label>
              {hideMinorEvents && (
                <div className="threshold-input">
                  <label>Threshold:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={significanceThreshold}
                    onChange={(e) => setSignificanceThreshold(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                  />
                  <span>%</span>
                </div>
              )}
            </div>
          </div>

          {/* Add footer to bottom of sidebar */}
          <div className="sidebar-footer">
          </div>
        </div>
      )}

      <div className={`app ${profileData.length > 0 ? 'app-with-sidebar' : ''}`}>
        {/* Only show header when no file is loaded */}
        {!profileData.length && (
          <>
            <h1>Pega Tracer Event Performance Visualizer</h1>
            <div className="header-subtitle">
              Analyze and visualize Pega tracer events to identify performance bottlenecks
            </div>
            
            <div className="info-panels">
              <div className="info-panel">
                <h2><span role="img" aria-label="file">📄</span> About Tracer Files</h2>
                <p>
                  This tool analyzes Pega Tracer XML files, which contain detailed execution logs of your Pega application. 
                  These files can be exported from the Pega Platform's Tracer tool, which records step-by-step execution details 
                  of your application's processes.
                </p>
                <a href="https://docs.pega.com/bundle/platform-88/page/platform/app-dev/offline-debugging-tracerviewer.html" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="learn-more-link">
                  Learn more about Pega Tracer
                </a>
              </div>

              <div className="info-panel">
                <h2><span role="img" aria-label="steps">🔍</span> How It Works</h2>
                <ol className="steps-list">
                  <li><strong>Upload:</strong> Start by uploading your Pega Tracer XML file using the button below</li>
                  <li><strong>Analyze:</strong> The tool will process your file and generate an interactive visualization</li>
                  <li><strong>Explore:</strong> Navigate through the hierarchical tree view of your application's execution</li>
                </ol>
              </div>

              <div className="info-panel">
                <h2><span role="img" aria-label="features">⚡</span> Key Features</h2>
                <ul className="features-list">
                  <li>Hierarchical visualization of execution steps</li>
                  <li>Performance metrics for each operation</li>
                  <li>Identification of resource-intensive steps</li>
                  <li>Duration analysis with percentage breakdowns</li>
                  <li>Filtering options to focus on significant events</li>
                </ul>
              </div>
            </div>

            {/* Upload section */}
            <div className="controls-section">
              <div className="upload-section">
                <h2 className="upload-title">Please upload a Pega Tracer XML file to begin</h2>
                <div className="file-upload-group">
                  <label className="btn btn-upload">
                    <input
                      type="file"
                      accept=".xml"
                      onChange={(e) => handleFileUpload(e, 'tracer')}
                      className="file-input"
                    />
                    <span role="img" aria-label="folder">📁</span>
                    Choose Tracer XML File
                    {filesUploaded.tracer && <span className="file-uploaded">✓</span>}
                  </label>
                </div>
              </div>
            </div>

            <div className="info-panels bottom-panels">
              <div className="info-panel">
                <h2><span role="img" aria-label="security">🔒</span> Secure & Private Analysis</h2>
                <p>
                  All processing happens locally in your browser. No data is sent to any servers 
                  and no internet connection is required.
                </p>
              </div>

              <div className="info-panel">
                <h2><span role="img" aria-label="clipboard">📋</span> Supported Tracer Actions</h2>
                <ul className="features-list">
                  <li>Activities</li>
                  <li>Data Transforms</li>
                  <li>Data Pages</li>
                  <li>Stream Rules</li>
                </ul>
                <div className="tip tip-text">
                  <span role="img" aria-label="tip">💡</span> Tip: Enable the "Abbreviate Events" option when capturing your tracer session to reduce the file size.
                </div>
              </div>
            </div>
          </>
        )}
        
        {error && (
          <div className="error-message">
            <span role="img" aria-label="error">❌</span> {error}
          </div>
        )}

        {isLoading && (
          <div className="loading-message">
            Loading...
          </div>
        )}

        {!profileData.length && !error && !isLoading && (
          <div className="empty-state">
            <div className="empty-state-info">
            </div>
          </div>
        )}

        <div className="chart">
          {hideMinorEvents && hiddenRootNodes.length > 0 && (
            <div className="hidden-events-notice">
              {hiddenRootNodes.length} root-level event{hiddenRootNodes.length > 1 ? 's' : ''} hidden
            </div>
          )}
          {visibleProfileData.map((node, index) => (
            <ActivityNode 
              key={node.activity} 
              node={node} 
              siblings={profileData}
              rootTotalDuration={rootTotalDuration}
              hideMinorEvents={hideMinorEvents}
              significanceThreshold={significanceThreshold}
              expandedNodes={expandedNodes}
              setExpandedNodes={setExpandedNodes}
            />
          ))}
        </div>

        {/* Only show footer in main section when no file is loaded */}
        {!profileData.length && (
          <footer className="footer">
          </footer>
        )}
      </div>
    </>
  );
}

// ActivityNode component with expandable sections
const ActivityNode = ({ 
  node, 
  level = 0, 
  siblings = [], 
  rootTotalDuration, 
  hideMinorEvents,
  significanceThreshold,
  expandedNodes,
  setExpandedNodes 
}) => {
  const isMaxDurationPath = 
    node === siblings.reduce((max, sibling) => 
      (sibling.duration > (max?.duration || 0)) ? sibling : max
    , null);

  const [isExpanded, setIsExpanded] = useState(() => {
    return expandedNodes.has(node.startSequence);
  });

  useEffect(() => {
    setIsExpanded(expandedNodes.has(node.startSequence));
  }, [expandedNodes, node.startSequence]);
  
  const hasChildren = node.children && node.children.length > 0;
  const duration = node.duration || 0;
  const parentTotalDuration = siblings.reduce((sum, sibling) => sum + (sibling.duration || 0), 0);
  
  const getPercentageClass = (percent) => {
    if (percent >= 30) return 'percentage-high';
    if (percent >= 10) return 'percentage-medium';
    if (percent >= 3) return 'percentage-low';
    return 'percentage-minimal';
  };
  
  const parentPercentage = parentTotalDuration > 0 ? (duration / parentTotalDuration) * 100 : 0;
  const totalPercentage = rootTotalDuration > 0 ? (duration / rootTotalDuration) * 100 : 0;
  const isMinorEvent = parentPercentage < significanceThreshold;
  
  if (hideMinorEvents && isMinorEvent) {
    return null;
  }

  const hiddenChildren = node.children?.filter(child => {
    const childDuration = child.duration || 0;
    const childPercentage = duration > 0 ? (childDuration / duration) * 100 : 0;
    return childPercentage < significanceThreshold;
  });

  return (
    <div className={`activity-group ${isMaxDurationPath ? 'max-duration-path' : ''}`}>
      <div className="activity-header">
        {hasChildren && (
          <span 
            className="expand-icon"
            onClick={() => {
              const newExpandedNodes = new Set(expandedNodes);
              if (isExpanded) {
                newExpandedNodes.delete(node.startSequence);
              } else {
                newExpandedNodes.add(node.startSequence);
              }
              setExpandedNodes(newExpandedNodes);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        <div className="activity-title">
          <span className="activity-name">
            {node.name || 'Unknown Activity'}
            {(node.startSequence || node.endSequence) && (
              <span className="sequence-number" title="Start and end sequence numbers">
                {` (#${node.startSequence}→${node.endSequence || '?'})`}
              </span>
            )}
          </span>
          {node.duration !== undefined && (
            <span className="activity-time">
              {` (${node.duration.toFixed(3)}s`}
              {duration > 0 && (
                <>
                  <span className={`percentage-value ${getPercentageClass(parentPercentage)}`}>
                    {` - ${parentPercentage.toFixed(1)}% of parent`}
                  </span>
                  <span className={`percentage-value ${getPercentageClass(totalPercentage)}`}>
                    {` | ${totalPercentage.toFixed(1)}% of total`}
                  </span>
                </>
              )}
              {')'}
            </span>
          )}
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="children" style={{ marginLeft: '20px' }}>
          {hideMinorEvents && hiddenChildren.length > 0 && (
            <div className="hidden-events-notice">
              {hiddenChildren.length} minor event{hiddenChildren.length > 1 ? 's' : ''} hidden
            </div>
          )}
          {node.children.map((child, index) => (
            <ActivityNode 
              key={`${child.name}-${index}`}
              node={child}
              level={level + 1}
              siblings={node.children}
              rootTotalDuration={rootTotalDuration}
              hideMinorEvents={hideMinorEvents}
              significanceThreshold={significanceThreshold}
              expandedNodes={expandedNodes}
              setExpandedNodes={setExpandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
