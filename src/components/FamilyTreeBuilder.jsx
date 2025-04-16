import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ArrowDownRight, Trash2, Save, RefreshCcw, ZoomIn, ZoomOut, Move, Maximize, Minimize } from 'lucide-react';

export default function FamilyTreeBuilder() {
  // === State Definitions ===
  const [nodes, setNodes] = useState([
    { id: 'root', name: '', parent: null, level: 0, color: '#3b82f6', x: 0, y: 0 }
  ]);
  const [connecting, setConnecting] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [connections, setConnections] = useState([]);
  const containerRef = useRef(null);
  const appContainerRef = useRef(null);
  
  // Canvas transformation state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Node dragging state
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Color palette for node grouping
  const [colors] = useState([
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  ]);

  // === Utility Functions ===

  const getColorForParent = (parentId) => {
    // Get color for siblings - all nodes with the same parent should have the same color
    const parentNode = nodes.find(node => node.id === parentId);
    if (!parentNode) return colors[0];
    
    // If there are already siblings with this parent, use their color
    const siblings = nodes.filter(node => node.parent === parentId);
    if (siblings.length > 0) {
      return siblings[0].color;
    }
    
    // For a new child with no siblings yet, choose a different color than the parent
    const parentColorIndex = colors.indexOf(parentNode.color);
    // Pick the next color in the palette
    return colors[(parentColorIndex + 1) % colors.length];
  };

  const updateDragPosition = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDragPosition({ 
      x: (e.clientX - rect.left - position.x) / scale,
      y: (e.clientY - rect.top - position.y) / scale
    });
  };

  const groupNodesByLevel = () => {
    return nodes.reduce((acc, node) => {
      acc[node.level] = acc[node.level] || [];
      acc[node.level].push(node);
      return acc;
    }, {});
  };

  // === Canvas Controls ===
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 2));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.1)); // Changed minimum zoom to 0.1 (10%)
  };
  
  const handleWheelZoom = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setScale(prev => Math.max(0.1, Math.min(prev + delta, 2))); // Changed minimum zoom to 0.1 (10%)
    }
  };
  
  const handleStartPan = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle mouse or Alt+Left click
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handlePan = (e) => {
    if (isPanning) {
      setPosition({
        x: position.x + (e.clientX - panStart.x),
        y: position.y + (e.clientY - panStart.y)
      });
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  const handleEndPan = () => {
    setIsPanning(false);
  };

  // === Full Screen Handling ===
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (appContainerRef.current.requestFullscreen) {
        appContainerRef.current.requestFullscreen();
      } else if (appContainerRef.current.mozRequestFullScreen) { /* Firefox */
        appContainerRef.current.mozRequestFullScreen();
      } else if (appContainerRef.current.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        appContainerRef.current.webkitRequestFullscreen();
      } else if (appContainerRef.current.msRequestFullscreen) { /* IE/Edge */
        appContainerRef.current.msRequestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) { /* Chrome, Safari & Opera */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE/Edge */
        document.msExitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    };
  }, []);

  // === Node Dragging Handlers ===
  
  const handleStartNodeDrag = (nodeId, e) => {
    // Only start dragging if it's not a click on input, button, or connection button
    if (
      e.target.tagName === 'INPUT' || 
      e.target.tagName === 'BUTTON' ||
      e.target.closest('button') // Check for button child elements like SVG icons
    ) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate the offset between cursor and the top-left of the node
    setDragOffset({
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    });
    
    setDraggingNode(nodeId);
  };
  
  const handleNodeDrag = (e) => {
    if (!draggingNode || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = (e.clientX - containerRect.left - position.x) / scale - dragOffset.x;
    const newY = (e.clientY - containerRect.top - position.y) / scale - dragOffset.y;
    
    setNodes(nodes.map(node => 
      node.id === draggingNode ? { ...node, x: newX, y: newY } : node
    ));
  };
  
  const handleEndNodeDrag = () => {
    setDraggingNode(null);
  };

  // === Handlers ===

  const handleStartConnecting = (nodeId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setConnecting(nodeId);
    setIsDragging(true);
    updateDragPosition(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging) updateDragPosition(e);
    if (isPanning) handlePan(e);
    if (draggingNode) handleNodeDrag(e);
  };

  const handleMouseUp = (e) => {
    setIsDragging(false);
    handleEndPan();
    handleEndNodeDrag();
    
    if (!connecting) return;

    const element = document.elementFromPoint(e.clientX, e.clientY);
    const targetNodeId = element?.closest('[data-node-id]')?.dataset.nodeId;

    if (!targetNodeId) {
      const parentNode = nodes.find(node => node.id === connecting);
      if (!parentNode) return;

      const newId = `node-${Math.random().toString(36).substring(2, 9)}`;
      const color = getColorForParent(connecting);
      
      // Calculate default position based on parent node
      const parentEl = document.querySelector(`[data-node-id="${connecting}"]`);
      const containerRect = containerRef.current?.getBoundingClientRect();
      let newX = 0, newY = 0;
      
      if (parentEl && containerRect) {
        const parentRect = parentEl.getBoundingClientRect();
        newX = (parentRect.left + parentRect.width / 2 - containerRect.left - position.x) / scale;
        newY = (parentRect.top + 100 - containerRect.top - position.y) / scale; // Place below parent
      } else if (parentNode.x !== undefined && parentNode.y !== undefined) {
        // If we have stored coordinates for parent
        newX = parentNode.x;
        newY = parentNode.y + 100; // Place below parent
      }
      
      setNodes([...nodes, {
        id: newId,
        name: '',
        parent: connecting,
        level: parentNode.level + 1,
        color,
        x: newX,
        y: newY
      }]);
    }

    setConnecting(null);
  };

  const handleNameChange = (id, newName) => {
    setNodes(nodes.map(node => node.id === id ? { ...node, name: newName } : node));
  };

  const handleDeleteNode = (id, e) => {
    e.stopPropagation();
    const descendants = [];
    const collectDescendants = (nodeId) => {
      nodes.forEach(child => {
        if (child.parent === nodeId) {
          descendants.push(child.id);
          collectDescendants(child.id);
        }
      });
    };
    collectDescendants(id);
    setNodes(nodes.filter(n => n.id !== id && !descendants.includes(n.id)));
  };

  const handleSave = () => {
    const data = JSON.stringify(nodes);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-tree.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loaded = JSON.parse(event.target.result);
        if (!Array.isArray(loaded)) throw new Error();
        setNodes(loaded);
      } catch {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setNodes([{ id: 'root', name: '', parent: null, level: 0, color: '#3b82f6', x: 0, y: 0 }]);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // === Effect Hooks ===

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, connecting, isPanning, draggingNode]);

  useLayoutEffect(() => {
    const newConnections = nodes.map(node => {
      if (!node.parent) return null;

      const parentNode = nodes.find(n => n.id === node.parent);
      const childNode = node;
      
      if (!parentNode) return null;
      
      // If we have custom positions for both nodes, use those directly
      if (
        parentNode.x !== undefined && parentNode.y !== undefined &&
        childNode.x !== undefined && childNode.y !== undefined
      ) {
        const startX = parentNode.x + 80; // middle of the parent node
        const startY = parentNode.y + 40; // bottom of the parent node
        const endX = childNode.x + 80; // middle of the child node
        const endY = childNode.y; // top of the child node
        
        // Create bezier curve
        const path = `M ${startX},${startY} C ${startX},${(startY + endY) / 2} ${endX},${(startY + endY) / 2} ${endX},${endY}`;
        return { key: `${node.parent}-${node.id}`, path, color: node.color };
      }
      
      // Fallback to DOM-based positioning
      const parentEl = document.querySelector(`[data-node-id="${node.parent}"]`);
      const childEl = document.querySelector(`[data-node-id="${node.id}"]`);
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (!parentEl || !childEl || !containerRect) return null;

      const parentRect = parentEl.getBoundingClientRect();
      const childRect = childEl.getBoundingClientRect();

      const startX = (parentRect.left + parentRect.width / 2 - containerRect.left - position.x) / scale;
      const startY = (parentRect.bottom - containerRect.top - position.y) / scale;
      const endX = (childRect.left + childRect.width / 2 - containerRect.left - position.x) / scale;
      const endY = (childRect.top - containerRect.top - position.y) / scale;

      const path = `M ${startX},${startY} C ${startX},${(startY + endY) / 2} ${endX},${(startY + endY) / 2} ${endX},${endY}`;
      return { key: `${node.parent}-${node.id}`, path, color: node.color };
    }).filter(Boolean);

    setConnections(newConnections);
  }, [nodes, scale, position]);

  // === Render ===

  const nodesByLevel = groupNodesByLevel();
  const canvasStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: '0 0',
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4" ref={appContainerRef}>
      {/* Top Bar */}
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Family Tree Builder</h1>
        <div className="flex gap-2 items-center">
          <div className="bg-white border border-gray-200 rounded-md mr-2 flex">
            <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 border-r" title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <div className="px-2 flex items-center">
              {Math.round(scale * 100)}%
            </div>
            <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 border-l" title="Zoom In">
              <ZoomIn size={16} />
            </button>
          </div>
          <input type="file" id="load-file" className="hidden" onChange={handleLoad} accept=".json" />
          <label htmlFor="load-file" className="cursor-pointer px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm flex items-center gap-1">Load</label>
          <button onClick={handleSave} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-1">
            <Save size={16} /> Save
          </button>
          <button onClick={handleReset} className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm flex items-center gap-1">
            <RefreshCcw size={16} /> Reset
          </button>
          <button 
            onClick={toggleFullScreen} 
            className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded text-sm flex items-center gap-1"
          >
            {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
            {isFullScreen ? "Exit Full Screen" : "Full Screen"}
          </button>
        </div>
      </div>

      {/* Canvas Controls */}
      <div className="absolute bottom-6 right-6 bg-white shadow-md rounded-md z-10 border border-gray-200">
        <button className="p-2 hover:bg-gray-100 border-b" title="Pan" aria-label="Pan Tool">
          <Move size={20} />
        </button>
        <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 border-b" title="Zoom In">
          <ZoomIn size={20} />
        </button>
        <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 border-b" title="Zoom Out">
          <ZoomOut size={20} />
        </button>
        <button onClick={toggleFullScreen} className="p-2 hover:bg-gray-100" title={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
          {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>

      {/* Tree Container */}
      <div 
        className="relative flex-1 overflow-auto border border-gray-200 rounded bg-white" 
        ref={containerRef}
        onWheel={handleWheelZoom}
        onMouseDown={handleStartPan}
        style={{ cursor: isPanning ? 'grabbing' : (draggingNode ? 'move' : 'default') }}
      >
        {/* Connection Paths */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <g style={canvasStyle}>
            {connections.map(conn => (
              <path key={conn.key} d={conn.path} stroke={conn.color} strokeWidth="2" fill="none" />
            ))}
            {isDragging && connecting && (() => {
              const sourceEl = document.querySelector(`[data-node-id="${connecting}"]`);
              if (!sourceEl || !containerRef.current) return null;
              const rect = sourceEl.getBoundingClientRect();
              const containerRect = containerRef.current.getBoundingClientRect();
              const x1 = (rect.left + rect.width / 2 - containerRect.left - position.x) / scale;
              const y1 = (rect.bottom - containerRect.top - position.y) / scale;
              return <path d={`M ${x1},${y1} L ${dragPosition.x},${dragPosition.y}`} stroke="gray" strokeWidth="2" strokeDasharray="5,5" fill="none" />;
            })()}
          </g>
        </svg>

        {/* Node Editor */}
        <div className="p-8 h-full relative" style={canvasStyle}>
          {nodes.map(node => (
            <div 
              key={node.id}
              className="absolute"
              data-node-id={node.id}
              style={{ 
                left: `${node.x}px`, 
                top: `${node.y}px`,
                cursor: draggingNode === node.id ? 'move' : 'grab'
              }}
              onMouseDown={(e) => handleStartNodeDrag(node.id, e)}
            >
              <div className="p-2 min-w-36 rounded-lg shadow border" style={{ borderLeft: `4px solid ${node.color}`, backgroundColor: `${node.color}10` }}>
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    value={node.name}
                    onChange={(e) => handleNameChange(node.id, e.target.value)}
                    className="border border-gray-300 rounded p-1 w-full text-sm"
                    placeholder={node.id === 'root' ? "Father's Name" : "Name"}
                  />
                  {node.id !== 'root' && (
                    <button onClick={(e) => handleDeleteNode(node.id, e)} className="text-gray-400 hover:text-red-500 ml-1" title="Delete Node">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <button
                  className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-1 shadow border border-gray-200 hover:bg-gray-100"
                  onMouseDown={(e) => handleStartConnecting(node.id, e)}
                  title="Create Child"
                >
                  <ArrowDownRight size={14} className="text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Help Text */}
      <div className="mt-4 text-center text-gray-600 text-sm">
        <p>
          <ArrowDownRight size={14} className="inline" /> Add children | 
          <Move size={14} className="inline mx-1" /> Alt+Drag or Middle-click to pan | 
          <ZoomIn size={14} className="inline mx-1" /> Ctrl+Wheel to zoom | 
          <Maximize size={14} className="inline mx-1" /> Toggle full screen |
          Drag nodes to reposition
        </p>
      </div>
    </div>
  );
}