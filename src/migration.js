import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "./components/ui/card.js";
import { fetchSchemaDetails } from "./services/api.js";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue
} from "./components/ui/select.js";
import { Button } from "./components/ui/button.js";
import {
  Upload,
  File,
  AlertCircle,
  CheckCircle,
  Loader2,
  LogOut,
  Search,
  Bell,
  Settings,
  Send
} from "lucide-react";
import { getAvatarInitials, getAvatarColor } from './components/ui/avatar.js';
import { getCatalogs, getSchemas, getTables, uploadData, getWorkspaceStats, migrateCloudData } from './services/api.js';
import {
  FaRobot,
  FaTimes,
  FaTrash,
  FaHistory,
  FaMicrophone,
  FaMicrophoneSlash
} from "react-icons/fa";
import eucloidLogo from "./components/ui/eucloid.png";

// Custom Tailwind CSS for moving gradient
const movingGradientStyle = `
@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.moving-gradient {
  background: linear-gradient(45deg, #4f46e5, #7c3aed, #db2777, #f59e0b);
  background-size: 200% 200%;
  animation: gradientMove 8s ease infinite;
}
`;

// BackgroundElements Component
const BackgroundElements = () => {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      <motion.div
        initial={{ x: -100, y: -100 }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          transition: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-10 blur-xl"
      />
      <motion.div
        initial={{ x: 200, y: 300 }}
        animate={{
          x: [0, -100, 0],
          y: [0, -150, 0],
          transition: { duration: 25, repeat: Infinity, ease: "linear" }
        }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-10 blur-xl"
      />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3YzNkZjkiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6TTYgMzR2LTRINHY0SDB2Mmg0djRINnYtNGg0di0ySDZ6TTYgNFYwSDR2NEgwdjJoNHY0SDZ2LTRoNHYtMkg2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-5" />
    </div>
  );
};

// HandRaiseAnimation and AnimatedHand components
const HandRaiseAnimation = () => {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24">
      <path
        fill="#FFD700"
        d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
      />
    </svg>
  );
};

const AnimatedHand = () => {
  return (
    <motion.svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      animate={{
        rotate: [0, -45, 0, 45, 0],
        y: [0, -3, 0, -3, 0],
        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      }}
    >
      <path
        fill="#FFD700"
        d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
      />
    </motion.svg>
  );
};

// Navbar Component
function Navbar({ navigate, user, setUser, selectedWorkspace, setSelectedWorkspace }) {
  const NavLink = ({ to, children, className }) => (
    <button onClick={() => navigate(to)} className={className}>
      {children}
    </button>
  );

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate("/");
  };

  const displayName = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <nav className="flex items-center justify-between border-b border-indigo-100 pb-4 mb-6 px-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
      <div className="flex items-center space-x-4 pr-8">
        <a href="/home" className="flex items-center">
          <img 
            src={eucloidLogo} 
            alt="Eucloid UC Manager" 
            className="h-10"
          />
        </a>
      </div>
      <div className="flex-1 flex justify-center">
        <div className="flex items-center space-x-8">
          <NavLink to="/home" className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors">
            Home
          </NavLink>
          <NavLink to="/users" className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors">
            Users
          </NavLink>
          <NavLink to="/groups" className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors">
            Groups
          </NavLink>
          <NavLink 
            to="/catalog" 
            className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors"
          >
            Catalog
          </NavLink>
          <NavLink 
            to="/grant" 
            className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors"
          >
            Grant
          </NavLink>
          <NavLink 
            to="/migration" 
            className="text-lg font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Migration
          </NavLink>
        </div>
      </div>
      <div className="flex items-center space-x-4 pl-8">
        <Select 
          value={selectedWorkspace} 
          onValueChange={setSelectedWorkspace}
        >
          <SelectTrigger className="w-[180px] bg-white/90 hover:bg-gray-50 border border-indigo-100">
            <SelectValue placeholder="Select Workspace" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-indigo-100">
            <SelectItem value="db_certification">db_certification</SelectItem>
            <SelectItem value="demo">demo</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" className="text-gray-600 hover:text-red-600 transition-colors" onClick={handleLogout}>
          <LogOut className="h-5 w-5 mr-2" /> Logout
        </Button>
        <Search className="h-5 w-5 cursor-pointer text-gray-500 hover:text-indigo-600 transition-colors" />
        <Bell className="h-5 w-5 cursor-pointer text-gray-500 hover:text-indigo-600 transition-colors" />
        <Settings className="h-5 w-5 cursor-pointer text-gray-500 hover:text-indigo-600 transition-colors" />
        <div className="relative group">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium border border-indigo-100"
            style={{ backgroundColor: getAvatarColor(displayName) }}
          >
            {getAvatarInitials(displayName)}
          </div>
          <motion.div
            className="absolute right-0 top-10 hidden group-hover:block bg-gray-800 text-white text-sm rounded-lg p-2 shadow-lg z-50 min-w-[200px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="font-semibold">{displayName}</p>
            <p>{user?.email || 'No email available'}</p>
          </motion.div>
        </div>
      </div>
    </nav>
  );
}

// MigrationPage Component
const MigrationPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState("db_certification");
  const [migrationMode, setMigrationMode] = useState('local');
  const [catalogs, setCatalogs] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedCatalog, setSelectedCatalog] = useState("");
  const [selectedSchema, setSelectedSchema] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("");
  const [uploadStatus, setUploadStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [tableName, setTableName] = useState("");
  const [inferredSchema, setInferredSchema] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hello! Select an action from the dropdown or use voice commands to manage data migration tasks (e.g., upload file, migrate cloud data, fetch schema, or optimize workspace)." }
  ]);
  const [selectedAction, setSelectedAction] = useState("");
  const [actionParams, setActionParams] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  // Cloud migration states
  const [cloudProvider, setCloudProvider] = useState("");
  const [cloudSourcePath, setCloudSourcePath] = useState("");
  const [cloudCredentials, setCloudCredentials] = useState({ roleArn: "" });
  const [cloudSchema, setCloudSchema] = useState([]);
  const [metadataTags, setMetadataTags] = useState([]);
const [currentTag, setCurrentTag] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    if (!storedUser || !token) {
      navigate("/");
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const catalogList = await getCatalogs();
        setCatalogs(catalogList);
      } catch (error) {
        setErrorMessage("Failed to fetch catalogs: " + error.message);
      }
    };
    fetchCatalogs();
  }, []);

  useEffect(() => {
    if (selectedCatalog) {
      const fetchSchemas = async () => {
        try {
          const schemaList = await getSchemas(selectedCatalog);
          setSchemas(schemaList);
          setSelectedSchema("");
          setTables([]);
          setSelectedTable("");
        } catch (error) {
          setErrorMessage("Failed to fetch schemas: " + error.message);
        }
      };
      fetchSchemas();
    } else {
      setSchemas([]);
      setTables([]);
      setSelectedSchema("");
      setSelectedTable("");
    }
  }, [selectedCatalog]);

  useEffect(() => {
    const fetchTables = async () => {
      if (!selectedCatalog || !selectedSchema) {
        setTables([]);
        setSelectedTable("");
        return;
      }
      setIsLoadingTables(true);
      setErrorMessage("");
      try {
        const tableList = await getTables(selectedCatalog, selectedSchema);
        setTables(Array.isArray(tableList) ? tableList : []);
        setSelectedTable("");
      } catch (error) {
        setErrorMessage(`Failed to fetch tables: ${error.message}`);
      } finally {
        setIsLoadingTables(false);
      }
    };
    fetchTables();
  }, [selectedCatalog, selectedSchema]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.warn("SpeechRecognition API not supported in this browser.");
      setChatMessages((prev) => [...prev, { sender: "bot", text: "Speech recognition not supported. Please use text input." }]);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      setChatMessages((prev) => [...prev, { sender: "user", text: `Voice: ${transcript}` }]);
      processVoiceCommand(transcript);
    };

    recognitionRef.current.onerror = (event) => {
      setChatMessages((prev) => [...prev, { sender: "bot", text: `Voice recognition error: ${event.error}` }]);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const actions = [
    {
      value: "upload_file",
      label: "Upload File",
      params: [
        { name: "catalog", placeholder: "Enter catalog name", type: "text" },
        { name: "schema", placeholder: "Enter schema name", type: "text" },
        { name: "table", placeholder: "Enter table name", type: "text" }
      ],
      keywords: ["upload file", "upload data", "load file"]
    },
    {
      value: "migrate_cloud",
      label: "Migrate Cloud Data",
      params: [
        { name: "cloudProvider", placeholder: "Enter cloud provider (s3, gcs, azure)", type: "text" },
        { name: "sourcePath", placeholder: "Enter source path (e.g., s3://bucket/path)", type: "text" },
        { name: "catalog", placeholder: "Enter catalog name", type: "text" },
        { name: "schema", placeholder: "Enter schema name", type: "text" },
        { name: "table", placeholder: "Enter table name", type: "text" }
      ],
      keywords: ["migrate cloud", "migrate from", "cloud migration"]
    },
    {
      value: "fetch_schema",
      label: "Fetch Schema",
      params: [
        { name: "catalog", placeholder: "Enter catalog name", type: "text" },
        { name: "schema", placeholder: "Enter schema name", type: "text" },
        { name: "table", placeholder: "Enter table name", type: "text" }
      ],
      keywords: ["fetch schema", "get schema", "schema of"]
    },
    {
      value: "optimize_workspace",
      label: "Optimize Workspace",
      params: [],
      keywords: ["optimize workspace", "improve workspace", "analyze workspace"]
    }
  ];

  const quickActions = [
    { label: "Upload File", action: "upload_file", params: { catalog: "catalog1", schema: "schema1", table: "table1" } },
    { 
      label: "Migrate from S3", 
      action: "migrate_cloud", 
      params: { 
        cloudProvider: cloudProvider || "s3", 
        sourcePath: cloudSourcePath || "s3://ucmanager/my-data/", 
        catalog: selectedCatalog || "catalog1", 
        schema: selectedSchema || "schema1", 
        table: tableName || "table1",
        credentials: cloudCredentials.roleArn ? { roleArn: cloudCredentials.roleArn } : undefined
      } 
    },
    { label: "Fetch Schema", action: "fetch_schema", params: { catalog: "catalog1", schema: "schema1", table: "table1" } },
    { label: "Optimize Workspace", action: "optimize_workspace", params: {} }
  ];

  const handleAddTag = () => {
    if (currentTag.trim() && !metadataTags.includes(currentTag.trim())) {
      setMetadataTags([...metadataTags, currentTag.trim()]);
      setCurrentTag("");
    }
  };
  
  const handleRemoveTag = (tagToRemove) => {
    setMetadataTags(metadataTags.filter(tag => tag !== tagToRemove));
  };
  const inferSchemaFromFile = async (file, fileType) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          let schema = [];
          
          if (fileType === 'csv') {
            const csvData = event.target.result;
            const lines = csvData.split('\n');
            if (lines.length === 0) throw new Error("Empty CSV file");
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/^["'](.*)["']$/, '$1'));
            
            if (lines.length > 1) {
              const sampleRow = lines[1].split(',');
              schema = headers.map((header, i) => {
                const value = (sampleRow[i] || '').trim();
                return {
                  name: header,
                  type: inferDataType(value)
                };
              });
            } else {
              schema = headers.map(header => ({
                name: header,
                type: 'string'
              }));
            }
          } else if (fileType === 'json') {
            let data = JSON.parse(event.target.result);
            if (Array.isArray(data)) {
              if (data.length === 0) throw new Error("Empty JSON array");
              const sampleItem = data[0] || {};
              schema = Object.keys(sampleItem).map(key => ({
                name: key,
                type: inferDataType(sampleItem[key])
              }));
            } else {
              schema = Object.keys(data).map(key => ({
                name: key,
                type: inferDataType(data[key])
              }));
            }
          } else if (fileType === 'xlsx') {
            const workbook = XLSX.read(event.target.result, { type: 'binary' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            if (jsonData.length === 0) throw new Error("Empty Excel sheet");
            
            if (jsonData.length > 0) {
              const headers = jsonData[0];
              if (jsonData.length > 1) {
                const sampleRow = jsonData[1];
                schema = headers.map((header, i) => ({
                  name: String(header).trim(),
                  type: inferDataType(sampleRow[i])
                }));
              } else {
                schema = headers.map(header => ({
                  name: String(header).trim(),
                  type: 'string'
                }));
              }
            }
          }
          
          schema = schema.map(col => ({
            ...col,
            name: col.name.replace(/[^\w]/g, '_').replace(/^[0-9]/, '_$&')
          }));
          
          resolve(schema);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error("Failed to read file"));
      
      if (fileType === 'csv' || fileType === 'json') {
        reader.readAsText(file);
      } else if (fileType === 'xlsx') {
        reader.readAsBinaryString(file);
      }
    });
  };

  const handleCloudSchemaChange = (index, field, value) => {
    const updatedSchema = [...cloudSchema];
    updatedSchema[index] = { ...updatedSchema[index], [field]: value };
    setCloudSchema(updatedSchema);
  };

  const addSchemaColumn = () => {
    setCloudSchema([...cloudSchema, { name: '', type: 'STRING' }]);
  };

  const removeSchemaColumn = (index) => {
    setCloudSchema(cloudSchema.filter((_, i) => i !== index));
  };
  const inferDataType = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'string'; // Default to string for empty/null values
    }
    if (value === true || value === false) return 'boolean';
    if (!isNaN(value) && value.toString().trim() !== '') {
      return Number.isInteger(Number(value)) ? 'integer' : 'double';
    }
    if (!isNaN(Date.parse(value))) return 'timestamp';
    return 'string';
  };

  const mapToDatabricksType = (type) => {
    const typeMap = {
      'string': 'STRING',
      'integer': 'INT',
      'double': 'DOUBLE',
      'float': 'FLOAT',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'timestamp': 'TIMESTAMP'
    };
    return typeMap[type.toLowerCase()] || 'STRING'; // Default to STRING
  };

  const processVoiceCommand = (transcript) => {
    const action = actions.find((act) =>
      act.keywords.some((keyword) => transcript.includes(keyword))
    );

    if (!action) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, I didn't recognize that command. Please try again or select an action from the dropdown." }
      ]);
      return;
    }

    setSelectedAction(action.value);
    let params = {};

    if (action.value === "upload_file") {
      const match = transcript.match(/to\s+([\w\s]+)\.([\w\s]+)\.([\w\s]+)/i);
      if (match) {
        params.catalog = match[1].trim();
        params.schema = match[2].trim();
        params.table = match[3].trim();
      }
    } else if (action.value === "migrate_cloud") {
      const match = transcript.match(/from\s+((s3|gs|abfss):\/\/[^ ]+)\s+to\s+([\w\s]+)\.([\w\s]+)\.([\w\s]+)/i);
      if (match) {
        params.sourcePath = match[1].trim();
        params.cloudProvider = match[2] === 's3' ? 's3' : match[2] === 'gs' ? 'gcs' : 'azure';
        params.catalog = match[3].trim();
        params.schema = match[4].trim();
        params.table = match[5].trim();
      } else {
        // Fallback to form state if voice command is incomplete
        params.cloudProvider = cloudProvider || "";
        params.sourcePath = cloudSourcePath || "";
        params.catalog = selectedCatalog || "";
        params.schema = selectedSchema || "";
        params.table = tableName || "";
      }
    }

    setActionParams(params);

    setChatMessages((prev) => [
      ...prev,
      { sender: "bot", text: `Recognized action: ${action.label}. ${Object.keys(params).length > 0 ? 'Parameters: ' + JSON.stringify(params) : 'Please provide parameters.'}` }
    ]);

    if (Object.keys(params).length > 0) {
      handleChatSubmit({ preventDefault: () => {} });
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setChatMessages((prev) => [...prev, { sender: "bot", text: "Listening for your voice command..." }]);
      } catch (error) {
        setChatMessages((prev) => [...prev, { sender: "bot", text: `Error starting voice recognition: ${error.message}` }]);
      }
    }
  };

  const generateWorkspaceInsights = async () => {
    try {
      const workspaceStats = await getWorkspaceStats();
      const {
        totalCatalogs,
        totalSchemas,
        totalTables,
        totalUsers,
        activeUsers,
        catalogData,
        usageData,
        recentQueries,
        privilegeDistribution
      } = workspaceStats;

      const insights = [];

      const totalStorage = catalogData.reduce((sum, catalog) => sum + catalog.value, 0);
      const highStorageCatalogs = catalogData.filter(catalog => catalog.value > totalStorage * 0.3);
      if (highStorageCatalogs.length > 0) {
        insights.push({
          severity: 'High',
          title: 'High Storage Usage Detected',
          description: `Catalog(s) ${highStorageCatalogs.map(c => c.name).join(', ')} are using ${highStorageCatalogs.reduce((sum, c) => sum + c.value, 0)} MB, which is more than 30% of total storage (${totalStorage} MB).`,
          recommendation: 'Review these catalogs for unused or old data.'
        });
      }

      const querySpikes = usageData.filter(day => day.queries > 100);
      if (querySpikes.length > 0) {
        insights.push({
          severity: 'Medium',
          title: 'Query Spikes Detected',
          description: `On ${querySpikes.map(day => day.day).join(', ')}, query counts exceeded 100 (${querySpikes.map(day => day.queries).join(', ')}).`,
          recommendation: 'Consider load balancing by scheduling queries during off-peak hours.'
        });
      }

      const engagementRate = (activeUsers / totalUsers) * 100;
      if (engagementRate < 30) {
        insights.push({
          severity: 'Medium',
          title: 'Low User Engagement',
          description: `Only ${activeUsers} out of ${totalUsers} users are active (${engagementRate.toFixed(1)}% engagement rate).`,
          recommendation: 'Engage inactive users through training sessions.'
        });
      }

      const privilegeChartData = Object.entries(privilegeDistribution.byPrivilege).map(([name, value]) => ({
        name,
        value
      }));
      const excessivePrivileges = privilegeChartData.filter(priv => priv.value > totalUsers * 0.5);
      if (excessivePrivileges.length > 0) {
        insights.push({
          severity: 'High',
          title: 'Excessive Privilege Assignments',
          description: `Privileges like ${excessivePrivileges.map(p => p.name).join(', ')} are assigned to more than 50% of users.`,
          recommendation: 'Audit privilege assignments.'
        });
      }

      const problematicQueries = recentQueries.filter(q => q.status === 'FAILED' || parseFloat(q.duration) > 60);
      if (problematicQueries.length > 0) {
        insights.push({
          severity: 'Medium',
          title: 'Problematic Queries Detected',
          description: `Found ${problematicQueries.length} problematic queries.`,
          recommendation: 'Optimize these queries.'
        });
      }

      return insights.length > 0 ? insights : [{ severity: 'Low', title: 'No Critical Issues', description: 'Your workspace is running smoothly.', recommendation: 'Continue monitoring.' }];
    } catch (error) {
      return [{ severity: 'Error', title: 'Failed to Analyze Workspace', description: 'Unable to fetch workspace data.', recommendation: 'Please try again later.' }];
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAction) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Please select an action from the dropdown or use a voice command." }
      ]);
      return;
    }

    const actionConfig = actions.find(action => action.value === selectedAction);
    const requiredParams = actionConfig.params.filter(param => !param.placeholder.includes("(optional)"));
    const missingParams = requiredParams.filter(param => !actionParams[param.name] || actionParams[param.name].trim() === "");

    if (missingParams.length > 0) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Please provide the following required parameters: ${missingParams.map(p => p.name).join(", ")}.` }
      ]);
      return;
    }

    const commandText = `${actionConfig.label}: ${JSON.stringify(actionParams)}`;
    setSearchHistory((prev) => {
      const newHistory = [...prev, { action: selectedAction, params: { ...actionParams } }].slice(-10);
      return newHistory;
    });

    setChatMessages((prev) => [...prev, { sender: "user", text: commandText }]);
    setIsBotTyping(true);

    try {
      switch (selectedAction) {
        case "upload_file": {
          if (!file) {
            setChatMessages((prev) => [
              ...prev,
              { sender: "bot", text: "Please select a file to upload first." }
            ]);
            setIsBotTyping(false);
            return;
          }

          const { catalog, schema, table } = actionParams;
          if (!inferredSchema || inferredSchema.length === 0) {
            setChatMessages((prev) => [
              ...prev,
              { sender: "bot", text: "Unable to determine schema from the file. Please ensure the file has headers and valid data." }
            ]);
            setIsBotTyping(false);
            return;
          }

          const databricksSchema = inferredSchema.map((col) => {
            const typeName = mapToDatabricksType(col.type);
            return {
              name: col.name,
              type_name: typeName,
              type_text: typeName,
              type_json: typeName,
              nullable: true,
              comment: `Inferred column: ${col.name}`
            };
          });

          const formData = new FormData();
          formData.append("file", file);
          formData.append("catalog", catalog);
          formData.append("schema", schema);
          formData.append("table", table);
          formData.append("fileType", fileType);
          formData.append("schemaDefinition", JSON.stringify(databricksSchema));

          await uploadData(formData);
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: `File uploaded successfully to ${catalog}.${schema}.${table}!` }
          ]);
          setFile(null);
          setFileType("");
          setInferredSchema([]);
          setSelectedCatalog("");
          setSelectedSchema("");
          setTableName("");
          break;
        }
        case "migrate_cloud": {
          const { cloudProvider, sourcePath, catalog, schema, table } = actionParams;
          const validPrefixes = ['s3://', 'gs://', 'abfss://'];
          if (!validPrefixes.some(prefix => sourcePath.startsWith(prefix))) {
            setChatMessages((prev) => [
              ...prev,
              { sender: "bot", text: "Invalid source path. Use formats like s3://bucket/path, gs://bucket/path, or abfss://container@account.dfs.core.windows.net/path" }
            ]);
            setIsBotTyping(false);
            return;
          }

          let requiredCredentials = [];
          let formattedCredentials = {};
          if (cloudProvider === 's3') {
            requiredCredentials = ['accessKey', 'secretKey'];
            formattedCredentials = {
              accessKey: cloudCredentials.accessKey,
              secretKey: cloudCredentials.secretKey
            };
          } else if (cloudProvider === 'gcs') {
            requiredCredentials = ['serviceAccountKey'];
            formattedCredentials = {
              serviceAccountKey: cloudCredentials.serviceAccountKey
            };
          } else if (cloudProvider === 'azure') {
            requiredCredentials = ['sasToken'];
            formattedCredentials = {
              sasToken: cloudCredentials.sasToken
            };
          }

          const missingCredentials = requiredCredentials.filter(
            key => !cloudCredentials[key] || 
            (typeof cloudCredentials[key] === 'string' && cloudCredentials[key].trim() === '') ||
            (typeof cloudCredentials[key] === 'object' && Object.keys(cloudCredentials[key]).length === 0)
          );
          if (missingCredentials.length > 0) {
            setChatMessages((prev) => [
              ...prev,
              { sender: "bot", text: `Please provide the following credentials via the Cloud Migration form: ${missingCredentials.join(', ')}` }
            ]);
            setIsBotTyping(false);
            return;
          }

          const formData = new FormData();
          formData.append("cloudProvider", cloudProvider);
          formData.append("sourcePath", sourcePath);
          formData.append("catalog", catalog);
          formData.append("schema", schema);
          formData.append("table", table);
          formData.append("credentials", JSON.stringify(formattedCredentials));
          formData.append("schemaDefinition", JSON.stringify([]));

          await migrateCloudData(formData);
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: `Data migrated successfully from ${sourcePath} to ${catalog}.${schema}.${table}!` }
          ]);
          setCloudProvider("");
          setCloudSourcePath("");
          setCloudCredentials({});
          setSelectedCatalog("");
          setSelectedSchema("");
          setTableName("");
          break;
        }
        case "fetch_schema": {
          const { catalog, schema, table } = actionParams;
          const schemaDetails = await fetchSchemaDetails(catalog, schema, table);
          let schemaMessage = `Schema for **${catalog}.${schema}.${table}**:\n\n`;
          schemaMessage += "| Column Name | Data Type | Nullable | Comment |\n";
          schemaMessage += "|------------|-----------|----------|--------|\n";
          schemaDetails.columns.forEach(col => {
            schemaMessage += `| ${col.name} | ${col.type_text || col.type_name} | ${col.nullable ? 'Yes' : 'No'} | ${col.comment || '-'} |\n`;
          });
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: schemaMessage }
          ]);
          break;
        }
        case "optimize_workspace": {
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Analyzing your workspace for optimization opportunities..." }
          ]);
          const insights = await generateWorkspaceInsights();
          let responseText = "Here are my recommendations for optimizing your workspace:\n\n";
          insights.forEach((insight, index) => {
            responseText += `${index + 1}. **${insight.title}** (${insight.severity})\n`;
            responseText += `   - **Issue**: ${insight.description}\n`;
            responseText += `   - **Recommendation**: ${insight.recommendation}\n\n`;
          });
          responseText += "Would you like to take action on any of these recommendations?";
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: responseText }
          ]);
          break;
        }
        default:
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Unknown action selected." }
          ]);
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Error: ${error.message}` }
      ]);
    } finally {
      setIsBotTyping(false);
      setSelectedAction("");
      setActionParams({});
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      const validTypes = ['csv', 'json', 'xlsx'];
      
      if (validTypes.includes(extension)) {
        setFileType(extension);
        setErrorMessage("");
        try {
          const schema = await inferSchemaFromFile(selectedFile, extension);
          setInferredSchema(schema);
        } catch (error) {
          setErrorMessage("Failed to infer schema: " + error.message);
        }
      } else {
        setFile(null);
        setFileType("");
        setInferredSchema([]);
        setErrorMessage("Unsupported file type. Please upload CSV, JSON, or Excel files.");
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedCatalog || !selectedSchema || !tableName || inferredSchema.length === 0) {
      setErrorMessage("Please select a file, catalog, schema, enter a table name, and ensure schema is inferred.");
      return;
    }
  
    setIsUploading(true);
    setUploadStatus(null);
    setErrorMessage("");
  
    try {
      const databricksSchema = inferredSchema.map((col) => {
        const typeName = mapToDatabricksType(col.type);
        return {
          name: col.name,
          type_name: typeName,
          type_text: typeName,
          type_json: typeName,
          nullable: true,
          comment: `Inferred column: ${col.name}`
        };
      });
  
      const formData = new FormData();
      formData.append("file", file);
      formData.append("catalog", selectedCatalog);
      formData.append("schema", selectedSchema);
      formData.append("table", tableName);
      formData.append("fileType", fileType);
      formData.append("schemaDefinition", JSON.stringify(databricksSchema));
      formData.append("metadata", JSON.stringify({ keywords: metadataTags })); // Add metadata tags
  
      await uploadData(formData);
      setUploadStatus("success");
      setFile(null);
      setFileType("");
      setSelectedTable("");
      setTableName("");
      setInferredSchema([]);
      setMetadataTags([]); // Clear tags after successful upload
    } catch (error) {
      setUploadStatus("error");
      let errorMsg = "Failed to upload data";
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloudMigration = async () => {
    if (!cloudProvider || !cloudSourcePath || !selectedCatalog || !selectedSchema || !tableName) {
      setErrorMessage("Please select a cloud provider, enter a source path, catalog, schema, and table name.");
      return;
    }
  
    // Validate source path format
    const validPrefixes = ['s3://', 'gs://', 'abfss://'];
    if (!validPrefixes.some(prefix => cloudSourcePath.startsWith(prefix))) {
      setErrorMessage("Invalid source path. Use formats like s3://bucket/path, gs://bucket/path, or abfss://container@account.dfs.core.windows.net/path");
      return;
    }
  
    setIsUploading(true);
    setUploadStatus(null);
    setErrorMessage("");
  
    try {
      const formData = new FormData();
      formData.append("cloudProvider", cloudProvider);
      formData.append("sourcePath", cloudSourcePath);
      formData.append("catalog", selectedCatalog);
      formData.append("schema", selectedSchema);
      formData.append("table", tableName);
      
      // Add credentials based on provider
      if (cloudProvider === 's3') {
        formData.append("credentials", JSON.stringify({
          roleArn: cloudCredentials.roleArn
        }));
      } else if (cloudProvider === 'gcs') {
        formData.append("credentials", JSON.stringify({
          serviceAccountKey: cloudCredentials.serviceAccountKey
        }));
      } else if (cloudProvider === 'azure') {
        formData.append("credentials", JSON.stringify({
          sasToken: cloudCredentials.sasToken
        }));
      }
  
      // Add schema definition if provided
      if (cloudSchema.length > 0) {
        formData.append('schemaDefinition', JSON.stringify(
          cloudSchema.map(col => ({
            name: col.name,
            type_name: mapToDatabricksType(col.type), // Use this mapping function
            type_text: mapToDatabricksType(col.type),
            type_json: mapToDatabricksType(col.type),
            nullable: true,
            comment: `Column ${col.name}`
          }))
        ));
      }
  
      await migrateCloudData(formData);
      setUploadStatus("success");
      setCloudProvider("");
      setCloudSourcePath("");
      setCloudCredentials({});
      setSelectedCatalog("");
      setSelectedSchema("");
      setTableName("");
      setCloudSchema([]);
    } catch (error) {
      setUploadStatus("error");
      setErrorMessage(error.message || "Failed to migrate data from cloud");
    } finally {
      setIsUploading(false);
    }
  };
  const handleClearChat = () => {
    setChatMessages([
      { sender: "bot", text: "Hello! Select an action from the dropdown or use voice commands to manage data migration tasks (e.g., upload file, migrate cloud data, fetch schema, or optimize workspace)." }
    ]);
    setSearchHistory([]);
    setSelectedAction("");
    setActionParams({});
  };

  const handleQuickAction = (action, params) => {
    setSelectedAction(action);
    setActionParams(params);
    handleChatSubmit({ preventDefault: () => {} });
  };

  const handleHistoryClick = (historyItem) => {
    setSelectedAction(historyItem.action);
    setActionParams(historyItem.params);
    handleChatSubmit({ preventDefault: () => {} });
  };

  const handleParamChange = (paramName, value) => {
    setActionParams((prev) => ({ ...prev, [paramName]: value }));
  };

  const displayName = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      <style>{movingGradientStyle}</style>
      <BackgroundElements />
      <div className="relative z-10">
        <Navbar
          navigate={navigate}
          user={user}
          setUser={setUser}
          selectedWorkspace={selectedWorkspace}
          setSelectedWorkspace={setSelectedWorkspace}
        />
        <div className="max-w-6xl mx-auto bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-50 shadow-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                Data Migration
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Local</span>
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    migrationMode === 'local' ? 'bg-indigo-200' : 'bg-indigo-600'
                  }`}
                  onClick={() => setMigrationMode(migrationMode === 'local' ? 'cloud' : 'local')}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      migrationMode === 'local' ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">Cloud</span>
              </div>
            </div>
            <p className="text-gray-600 mt-2 mb-6">
              {migrationMode === 'local'
                ? 'Upload data in CSV, JSON, or Excel format and migrate it to your desired catalog, schema, and table.'
                : 'Migrate data from AWS S3, Google Cloud Storage, or Azure Blob Storage to your Databricks workspace.'}
            </p>
            <Card className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/20 border border-indigo-50">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-gray-800">
                  {migrationMode === 'local' ? 'Local File Upload' : 'Cloud to Databricks Migration'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {migrationMode === 'cloud' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Cloud Provider
                        </label>
                        <Select value={cloudProvider} onValueChange={setCloudProvider}>
                          <SelectTrigger className="w-full bg-white border border-indigo-200">
                            <SelectValue placeholder="Choose a cloud provider" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-indigo-100">
                            <SelectItem value="s3">AWS S3</SelectItem>
                            <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                            <SelectItem value="azure">Azure Blob Storage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {cloudProvider && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Credentials
                          </label>
                          {cloudProvider === 's3' && (
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="AWS IAM Role ARN"
                                value={cloudCredentials.roleArn || ''}
                                onChange={(e) => setCloudCredentials({ ...cloudCredentials, roleArn: e.target.value })}
                                className="w-full p-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <p className="text-xs text-gray-500">
                                Format: arn:aws:iam::123456789012:role/your-role-name
                              </p>
                            </div>
                          )}
                          {cloudProvider === 'gcs' && (
                            <div>
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-indigo-200 border-dashed rounded-lg cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                                  <p className="mb-2 text-sm text-gray gastroenterologist-600">
                                    Upload GCS Service Account JSON Key
                                  </p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".json"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        try {
                                          const json = JSON.parse(event.target.result);
                                          setCloudCredentials({ ...cloudCredentials, serviceAccountKey: json });
                                        } catch (err) {
                                          setErrorMessage("Invalid JSON key file.");
                                        }
                                      };
                                      reader.readAsText(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                          {cloudProvider === 'azure' && (
                            <input
                              type="text"
                              placeholder="Azure SAS Token"
                              value={cloudCredentials.sasToken || ''}
                              onChange={(e) => setCloudCredentials({ ...cloudCredentials, sasToken: e.target.value })}
                              className="w-full p-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          )}
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Source Path
                        </label>
                        <input
                          type="text"
                          value={cloudSourcePath}
                          onChange={(e) => setCloudSourcePath(e.target.value)}
                          placeholder="e.g., s3://bucket/path, gs://bucket/path, abfss://container@account.dfs.core.windows.net/path"
                          className="w-full p-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Table Schema (Optional)
                        </label>
                        {cloudSchema.map((col, index) => (
                          <div key={index} className="flex items-center space-x-2 mb-2">
                            <input
                              type="text"
                              placeholder="Column Name"
                              value={col.name}
                              onChange={(e) => handleCloudSchemaChange(index, 'name', e.target.value)}
                              className="w-1/2 p-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <Select
                              value={col.type}
                              onValueChange={(value) => handleCloudSchemaChange(index, 'type', value)}
                            >
                              <SelectTrigger className="w-1/3 bg-white border border-indigo-200">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-indigo-100">
                                <SelectItem value="STRING">STRING</SelectItem>
                                <SelectItem value="INT">INT</SelectItem>
                                <SelectItem value="DOUBLE">DOUBLE</SelectItem>
                                <SelectItem value="TIMESTAMP">TIMESTAMP</SelectItem>
                                <SelectItem value="BOOLEAN">BOOLEAN</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              onClick={() => removeSchemaColumn(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          onClick={addSchemaColumn}
                          className="mt-2 text-indigo-600 border-indigo-600 hover:bg-indigo-50"
                        >
                          Add Column
                        </Button>
                      </div>
                    </>
                  )}
                  {migrationMode === 'local' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload File
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-indigo-200 border-dashed rounded-lg cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                            <p className="mb-2 text-sm text-gray-600">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                              CSV, JSON, or Excel (max 100MB)
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept=".csv,.json,.xlsx"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                      {file && (
                        <div className="mt-2 flex items-center text-sm text-gray-600">
                          <File className="w-5 h-5 mr-2 text-indigo-500" />
                          <span>{file.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Catalog
                    </label>
                    <Select value={selectedCatalog} onValueChange={setSelectedCatalog}>
                      <SelectTrigger className="w-full bg-white border border-indigo-200">
                        <SelectValue placeholder="Choose a catalog" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-indigo-100">
                        {catalogs.map((catalog) => (
                          <SelectItem key={catalog.name} value={catalog.name}>
                            {catalog.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Schema
                    </label>
                    <Select value={selectedSchema} onValueChange={setSelectedSchema} disabled={!selectedCatalog}>
                      <SelectTrigger className="w-full bg-white border border-indigo-200">
                        <SelectValue placeholder="Choose a schema" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-indigo-100">
                        {schemas.map((schema) => (
                          <SelectItem key={schema.name} value={schema.name}>
                            {schema.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Table Name
                    </label>
                    <input
                      type="text"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      placeholder="Enter table name"
                      className="w-full p-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metadata Tags
                    </label>
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Add metadata tag"
                        className="flex-1 p-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <Button
                        type="button"
                        onClick={handleAddTag}
                        className="bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Add
                      </Button>
                    </div>
                    {metadataTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {metadataTags.map((tag) => (
                          <div
                            key={tag}
                            className="flex items-center bg-indigo-100 text-indigo-800 rounded-full px-3 py-1 text-sm"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-2 text-indigo-600 hover:text-indigo-900"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                {migrationMode === 'local' && inferredSchema.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inferred Schema
                    </label>
                    <div className="bg-white p-4 rounded-md border border-indigo-200 max-h-40 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left p-2">Column Name</th>
                            <th className="text-left p-2">Data Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inferredSchema.map((col, index) => (
                            <tr key={index}>
                              <td className="p-2">{col.name}</td>
                              <td className="p-2">{col.type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {errorMessage && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                {uploadStatus === "success" && (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span>Data {migrationMode === 'local' ? 'uploaded' : 'migrated'} successfully!</span>
                  </div>
                )}
                <Button
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600"
                  onClick={migrationMode === 'local' ? handleUpload : handleCloudMigration}
                  disabled={
                    migrationMode === 'local'
                      ? isUploading || !file || !selectedCatalog || !selectedSchema || !tableName || inferredSchema.length === 0
                      : isUploading || !cloudProvider || !cloudSourcePath || !selectedCatalog || !selectedSchema || !tableName
                  }
                >
                  {migrationMode === 'local' ? (
                    isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Create Table & Upload Data
                      </>
                    )
                  ) : (
                    isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Create Table & Migrate Data
                      </>
                    )
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <div className="fixed bottom-6 right-6 z-50">
          <AnimatePresence>
            {!isChatOpen && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative flex flex-col items-center"
              >
                <motion.div
                  className="flex items-center space-x-2 mb-2 bg-indigo-600 text-white text-sm rounded-lg p-2 shadow-lg z-50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <AnimatedHand />
                  <span>Hi, I am Here to Help!</span>
                </motion.div>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 opacity-50 blur-lg animate-pulse" />
                  <Button
                    onClick={() => setIsChatOpen(true)}
                    className="relative bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-full p-4 shadow-xl hover:shadow-2xl hover:from-indigo-700 hover:to-indigo-600 transition-all duration-300"
                    aria-label="Open chatbot"
                  >
                    <FaRobot className="h-7 w-7" />
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 flex items-center justify-center z-50"
              onClick={() => setIsChatOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative w-[900px] h-[600px] rounded-lg shadow-2xl border border-indigo-200 flex flex-col overflow-hidden bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="chat-header bg-indigo-600 text-white px-4 py-3 border-b border-indigo-200 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <HandRaiseAnimation />
                    <h3 className="text-base font-semibold tracking-tight">Here is your Chatbot!</h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      onClick={() => setIsChatOpen(false)}
                      className="text-gray-300 hover:text-white hover:bg-indigo-500/30 p-1.5 rounded-full transition-colors"
                      aria-label="Close chat"
                    >
                      <FaTimes className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                  {searchHistory.length > 0 && (
                    <div className="p-4 border-b border-indigo-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <FaHistory className="h-5 w-5 text-indigo-400" />
                        <h4 className="text-gray-800 text-sm font-semibold">Search History</h4>
                      </div>
                      <div className="max-h-24 overflow-y-auto flex flex-wrap gap-2">
                        {searchHistory.map((item, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleHistoryClick(item)}
                            className="text-gray-800 border-indigo-400 bg-indigo-100 hover:bg-indigo-200 hover:text-gray-800 transition-colors rounded-full px-3 py-1 text-xs font-medium"
                          >
                            {actions.find(a => a.value === item.action)?.label}: {JSON.stringify(item.params)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 p-4 overflow-y-auto"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#a5b4fc #e0e7ff' }}
                  >
                    <motion.div
                      className="text-center text-gray-800 text-lg font-semibold mb-4 flex items-center justify-center space-x-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <HandRaiseAnimation />
                      <span>Hi, I am Here to Help!</span>
                    </motion.div>
                    <AnimatePresence>
                      {chatMessages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className={`mb-4 flex ${
                            message.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`flex items-start space-x-2 max-w-[70%] ${
                              message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                            }`}
                          >
                            {message.sender === "bot" && (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium bg-indigo-500">
                                <FaRobot className="h-5 w-5" />
                              </div>
                            )}
                            <div
                              className={`p-3 rounded-lg shadow-sm ${
                                message.sender === "user"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-indigo-100 text-gray-800"
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{message.text}</p>
                              <div className="text-xs mt-1 opacity-70 text-right">
                                {new Date().toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                            {message.sender === "user" && (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium bg-indigo-600"
                              >
                                {getAvatarInitials(displayName)}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {isBotTyping && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center space-x-2 mb-4"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium bg-indigo-500">
                            <FaRobot className="h-5 w-5" />
                          </div>
                          <div className="flex space-x-1">
                            <div
                              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="p-4 border-t border-indigo-200 bg-white">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action.action, action.params)}
                        className="text-gray-800 border-indigo-400 bg-indigo-100 hover:bg-indigo-200 hover:text-gray-800 transition-colors rounded-full px-3 py-1 text-xs font-medium"
                      >
                        {action.label}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearChat}
                      className="text-red-600 border-red-600 bg-white hover:bg-red-50 hover:text-red-700 transition-colors rounded-full px-3 py-1 text-xs font-medium"
                    >
                      <FaTrash className="h-3 w-3 mr-1" />
                      Clear Chat
                    </Button>
                  </div>
                  <form onSubmit={handleChatSubmit} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Select value={selectedAction} onValueChange={setSelectedAction}>
                        <SelectTrigger className="w-full bg-white border-indigo-400 rounded-full">
                          <SelectValue placeholder="Select an action" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-indigo-100">
                          {actions.map((action) => (
                            <SelectItem key={action.value} value={action.value}>
                              {action.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        onClick={toggleListening}
                        className={`rounded-full p-2.5 ${
                          isListening
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        } shadow-sm hover:shadow-md transition-all`}
                        aria-label={isListening ? "Stop listening" : "Start listening"}
                      >
                        {isListening ? (
                          <FaMicrophoneSlash className="h-5 w-5" />
                        ) : (
                          <FaMicrophone className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    {selectedAction && actions.find(a => a.value === selectedAction)?.params.map((param) => (
                      <input
                        key={param.name}
                        type={param.type}
                        value={actionParams[param.name] || ""}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        placeholder={param.placeholder}
                        className="p-2.5 border border-indigo-400 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800 text-sm transition-all placeholder:text-gray-400"
                        aria-label={param.placeholder}
                      />
                    ))}
                    <Button
                      type="submit"
                      className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-full p-2.5 shadow-sm hover:shadow-md transition-all"
                      disabled={!selectedAction}
                      aria-label="Send command"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MigrationPage;