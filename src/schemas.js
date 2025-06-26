import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from 'react-toastify';
import eucloidLogo from "./components/ui/eucloid.png";
import { Button } from "./components/ui/button.js";
import { Card, CardContent } from "./components/ui/card.js";
import { Input } from "./components/ui/input.js";
import { LogOut, Bell, Settings, Trash, Plus, X, Search, ArrowLeft, Send } from "lucide-react";
import { getAvatarInitials, getAvatarColor } from './components/ui/avatar.js';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "./components/ui/table.js";
import { 
  Select, 
  SelectItem, 
  SelectContent, 
  SelectTrigger,
  SelectValue 
} from "./components/ui/select.js";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "./components/ui/dialog.js";
import { 
  getSchemas, 
  createSchema, 
  deleteSchema, 
  getWorkspaceStats, 
  grantPrivileges,
  revokePrivileges,
  createTable,
  deleteTable
} from "./services/api.js";
import { 
  FaRobot,
  FaTimes,
  FaTrash,
  FaHistory,
  FaMicrophone,
  FaMicrophoneSlash
} from "react-icons/fa";

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
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-20 blur-xl"
      />
      <motion.div
        initial={{ x: 200, y: 300 }}
        animate={{
          x: [0, -100, 0],
          y: [0, -150, 0],
          transition: { duration: 25, repeat: Infinity, ease: "linear" }
        }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 opacity-20 blur-xl"
      />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM3YzNkZjkiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6TTYgMzR2LTRINHY0SDB2Mmg0djRINnYtNGg0di0ySDZ6TTYgNFYwSDR2NEgwdjJoNHY0SDZ2LTRoNHYtMkg2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-10" />
    </div>
  );
};

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

const actions = [
  { value: "create_schema", label: "Create Schema", params: [
    { name: "name", placeholder: "Enter schema name", type: "text" },
    { name: "catalogName", placeholder: "Enter catalog name", type: "text" },
    { name: "comment", placeholder: "Enter comment (optional)", type: "text" }
  ], keywords: ["create schema", "add schema", "new schema"] },
  { value: "delete_schema", label: "Delete Schema", params: [
    { name: "catalogName", placeholder: "Enter catalog name", type: "text" },
    { name: "schemaName", placeholder: "Enter schema name", type: "text" }
  ], keywords: ["delete schema", "remove schema"] },
  { value: "create_table", label: "Create Table", params: [
    { name: "catalogName", placeholder: "Enter catalog name", type: "text" },
    { name: "schemaName", placeholder: "Enter schema name", type: "text" },
    { name: "tableName", placeholder: "Enter table name", type: "text" },
    { name: "columns", placeholder: "Enter columns (JSON format, e.g., [{\"name\":\"id\",\"type\":\"int\"}])", type: "text" },
    { name: "comment", placeholder: "Enter comment (optional)", type: "text" },
    { name: "metadata", placeholder: "Enter metadata (JSON format, optional)", type: "text" }
  ], keywords: ["create table", "add table", "new table"] },
  { value: "delete_table", label: "Delete Table", params: [
    { name: "catalogName", placeholder: "Enter catalog name", type: "text" },
    { name: "schemaName", placeholder: "Enter schema name", type: "text" },
    { name: "tableName", placeholder: "Enter table name", type: "text" }
  ], keywords: ["delete table", "remove table"] },
  { value: "grant_privileges", label: "Grant Privileges", params: [
    { name: "privileges", placeholder: "Enter privileges (comma-separated)", type: "text" },
    { name: "principal", placeholder: "Enter principal (user/group)", type: "text" },
    { name: "securable_type", placeholder: "Enter securable type (e.g., SCHEMA)", type: "text" },
    { name: "full_name", placeholder: "Enter full name (e.g., catalog.schema)", type: "text" }
  ], keywords: ["grant privileges", "assign privileges", "set permissions"] },
  { value: "revoke_privileges", label: "Revoke Privileges", params: [
    { name: "privileges", placeholder: "Enter privileges (comma-separated)", type: "text" },
    { name: "principal", placeholder: "Enter principal (user/group)", type: "text" },
    { name: "securable_type", placeholder: "Enter securable type (e.g., SCHEMA)", type: "text" },
    { name: "full_name", placeholder: "Enter full name (e.g., catalog.schema)", type: "text" }
  ], keywords: ["revoke privileges", "remove privileges"] },
  { value: "optimize_workspace", label: "Optimize Workspace", params: [], keywords: ["optimize workspace", "improve workspace", "analyze workspace"] }
];

const quickActions = [
  { label: "Create Schema", action: "create_schema", params: { name: "new_schema", catalogName: "", comment: "" } },
  { label: "Delete Schema", action: "delete_schema", params: { catalogName: "", schemaName: "" } },
  { label: "Create Table", action: "create_table", params: { catalogName: "", schemaName: "", tableName: "new_table", columns: '[{"name":"id","type":"int"}]', comment: "", metadata: "{}" } },
  { label: "Grant Privileges", action: "grant_privileges", params: { privileges: "SELECT", principal: "user1", securable_type: "SCHEMA", full_name: "" } },
  { label: "Optimize Workspace", action: "optimize_workspace", params: {} }
];

function Navbar({ navigate, user, selectedWorkspace, setSelectedWorkspace, handleLogout, displayName }) {
  const NavLink = ({ to, children, className }) => (
    <button onClick={() => navigate(to)} className={className}>
      {children}
    </button>
  );

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
            className="text-lg font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Catalog
          </NavLink>
          <NavLink 
            to="/grant" 
            className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors"
          >
            Grant
          </NavLink>
          <NavLink to="/migration" className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors">Migration</NavLink>
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

function SchemaModal({ type, schema, catalogName, onClose, onSubmit }) {
  const [schemaName, setSchemaName] = useState(schema?.name || "");
  const [schemaComment, setSchemaComment] = useState(schema?.comment || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (!schemaName) {
        throw new Error('Schema name is required');
      }
      
      await onSubmit({ 
        name: schemaName,
        comment: schemaComment,
        catalogName
      });
      toast.success(`Schema ${type === 'delete' ? 'deleted' : 'created'} successfully!`);
      onClose();
    } catch (err) {
      setError(err.message || `Failed to ${type === 'delete' ? 'delete' : 'create'} schema`);
      toast.error(err.message || `Failed to ${type === 'delete' ? 'delete' : 'create'} schema`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onSubmit({ name: schema.name, catalogName });
      toast.success(`Schema '${schema.name}' deleted successfully!`);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete schema');
      toast.error(err.message || 'Failed to delete schema');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white shadow-lg rounded-lg border border-indigo-100">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
            {type === 'delete' ? 'Delete Schema' : 'Create New Schema'}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : type === 'delete' ? (
          <>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete <span className="font-semibold">{schema?.name}</span>?
              This will delete all tables within it.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
                {error}
              </div>
            )}
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="flex-1 border-indigo-100 text-gray-700 hover:bg-indigo-50" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 shadow-sm" 
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mx-auto"></div>
                ) : (
                  'Delete Schema'
                )}
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schema Name *</label>
                <Input
                  placeholder="Schema name"
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.target.value)}
                  className="border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Input
                  placeholder="Optional description"
                  value={schemaComment}
                  onChange={(e) => setSchemaComment(e.target.value)}
                  className="border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                />
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md">
                {error}
              </div>
            )}
            
            <div className="flex space-x-3 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 border-indigo-100 text-gray-700 hover:bg-indigo-50" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white shadow-sm"
                disabled={isLoading}
              >
                {isLoading ? 
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mx-auto"></div> : 
                  'Create Schema'
                }
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function SchemasPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const catalogName = queryParams.get('catalog');
  const [schemas, setSchemas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState("db_certification");
  const [modalType, setModalType] = useState(null);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hello! Select an action from the dropdown or use voice commands to manage schemas, tables, privileges, or optimize your workspace." }
  ]);
  const [selectedAction, setSelectedAction] = useState("");
  const [actionParams, setActionParams] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        setIsLoading(true);
        const data = await getSchemas(catalogName);
        setSchemas(data);
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    if (catalogName) {
      fetchSchemas();
    }
  }, [catalogName]);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate("/login");
  };

  const handleModalSubmit = async (data) => {
    try {
      if (modalType === 'delete' && selectedSchema) {
        await deleteSchema(catalogName, selectedSchema.name);
        const updatedSchemas = await getSchemas(catalogName);
        setSchemas(updatedSchemas);
      } else if (modalType === 'create') {
        if (!data.name) {
          throw new Error('Schema name is required');
        }
        await createSchema({
          catalogName: catalogName,
          name: data.name,
          comment: data.comment
        });
        const updatedSchemas = await getSchemas(catalogName);
        setSchemas(updatedSchemas);
      }
      setModalType(null);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      toast.error(err.message);
    }
  };

  const filteredSchemas = schemas.filter(schema => 
    schema.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      const privilegeChartData = Object.entries(privilegeDistribution).map(([name, value]) => ({
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
    if (action.value === "create_schema") {
      const schemaMatch = transcript.match(/schema\s+([\w\s]+)/i);
      const catalogMatch = transcript.match(/catalog\s+([\w\s]+)/i);
      if (schemaMatch) params.name = schemaMatch[1].trim();
      if (catalogMatch) params.catalogName = catalogMatch[1].trim();
      else params.catalogName = catalogName; // Default to current catalog
    } else if (action.value === "delete_schema") {
      const schemaMatch = transcript.match(/schema\s+([\w\s]+)/i);
      const catalogMatch = transcript.match(/catalog\s+([\w\s]+)/i);
      if (schemaMatch) params.schemaName = schemaMatch[1].trim();
      if (catalogMatch) params.catalogName = catalogMatch[1].trim();
      else params.catalogName = catalogName;
    } else if (action.value === "create_table") {
      const tableMatch = transcript.match(/table\s+([\w\s]+)/i);
      const schemaMatch = transcript.match(/schema\s+([\w\s]+)/i);
      const catalogMatch = transcript.match(/catalog\s+([\w\s]+)/i);
      if (catalogMatch) params.catalogName = catalogMatch[1].trim();
      else params.catalogName = catalogName;
      if (schemaMatch) params.schemaName = schemaMatch[1].trim();
      if (tableMatch) params.tableName = tableMatch[1].trim();
      params.columns = '[{"name":"id","type":"int"}]';
    } else if (action.value === "delete_table") {
      const tableMatch = transcript.match(/table\s+([\w\s]+)/i);
      const schemaMatch = transcript.match(/schema\s+([\w\s]+)/i);
      const catalogMatch = transcript.match(/catalog\s+([\w\s]+)/i);
      if (catalogMatch) params.catalogName = catalogMatch[1].trim();
      else params.catalogName = catalogName;
      if (schemaMatch) params.schemaName = schemaMatch[1].trim();
      if (tableMatch) params.tableName = tableMatch[1].trim();
    } else if (action.value === "grant_privileges" || action.value === "revoke_privileges") {
      const privilegesMatch = transcript.match(/privileges\s+([\w\s,]+)/i);
      const principalMatch = transcript.match(/to\s+([\w\s@]+)/i);
      const typeMatch = transcript.match(/type\s+([\w\s]+)/i);
      const nameMatch = transcript.match(/name\s+([\w\s\.]+)/i);
      if (privilegesMatch) params.privileges = privilegesMatch[1].trim();
      if (principalMatch) params.principal = principalMatch[1].trim();
      if (typeMatch) params.securable_type = typeMatch[1].trim();
      if (nameMatch) params.full_name = nameMatch[1].trim();
      else params.full_name = `${catalogName}.${params.schemaName || ''}`;
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
        case "create_schema": {
          const { name, catalogName: catalog, comment } = actionParams;
          await createSchema({ catalogName: catalog || catalogName, name, comment: comment || `Created via chatbot on ${new Date().toISOString()}` });
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: `Schema '${name}' created in catalog '${catalog || catalogName}' successfully!` }
          ]);
          toast.success(`Schema '${name}' created successfully!`);
          const updatedSchemas = await getSchemas(catalogName);
          setSchemas(updatedSchemas);
          break;
        }
        case "delete_schema": {
          const { catalogName: catalog, schemaName } = actionParams;
          await deleteSchema(catalog || catalogName, schemaName);
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: `Schema '${schemaName}' in catalog '${catalog || catalogName}' deleted successfully!` }
          ]);
          toast.success(`Schema '${schemaName}' deleted successfully!`);
          const updatedSchemas = await getSchemas(catalogName);
          setSchemas(updatedSchemas);
          break;
        }
        case "create_table": {
          const { catalogName: catalog, schemaName, tableName, columns, comment, metadata } = actionParams;
          let parsedColumns, parsedMetadata;
          try {
            parsedColumns = JSON.parse(columns);
            if (!Array.isArray(parsedColumns)) {
              throw new Error("Columns must be a JSON array.");
            }
          } catch (error) {
            throw new Error(`Invalid columns format: ${error.message}`);
          }
          try {
            parsedMetadata = metadata ? JSON.parse(metadata) : {};
            if (typeof parsedMetadata !== "object" || Array.isArray(parsedMetadata)) {
              throw new Error("Metadata must be a JSON object.");
            }
          } catch (error) {
            throw new Error(`Invalid metadata format: ${error.message}`);
          }
          const tableData = {
            name: tableName,
            columns: parsedColumns,
            comment: comment || `Created via chatbot on ${new Date().toISOString()}`,
            metadata: parsedMetadata
          };
          await createTable({ catalogName: catalog || catalogName, schemaName, tableData });
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: `Table '${tableName}' created in ${catalog || catalogName}.${schemaName} successfully!` }
          ]);
          toast.success(`Table '${tableName}' created successfully!`);
          break;
        }
        case "delete_table": {
          const { catalogName: catalog, schemaName, tableName } = actionParams;
          await deleteTable(catalog || catalogName, schemaName, tableName);
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: `Table '${tableName}' in ${catalog || catalogName}.${schemaName} deleted successfully!` }
          ]);
          toast.success(`Table '${tableName}' deleted successfully!`);
          break;
        }
        case "grant_privileges": {
          const { privileges, principal, securable_type, full_name } = actionParams;
          const privilegeList = privileges.split(",").map(p => p.trim().toUpperCase());
          await grantPrivileges({ securable_type, full_name, principal, privileges: privilegeList });
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: `Privileges '${privilegeList.join(", ")}' granted to '${principal}' on ${securable_type} '${full_name}' successfully!` }
          ]);
          toast.success(`Privileges '${privilegeList.join(", ")}' granted successfully!`);
          break;
        }
        case "revoke_privileges": {
          const { privileges, principal, securable_type, full_name } = actionParams;
          const privilegeList = privileges.split(",").map(p => p.trim().toUpperCase());
          await revokePrivileges({ securable_type, full_name, principal, privileges: privilegeList });
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: `Privileges '${privilegeList.join(", ")}' revoked from '${principal}' on ${securable_type} '${full_name}' successfully!` }
          ]);
          toast.success(`Privileges '${privilegeList.join(", ")}' revoked successfully!`);
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
          toast.success("Workspace analysis completed!");
          break;
        }
        default:
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Unknown action selected." }
          ]);
          toast.error("Unknown action selected.");
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Error: ${error.message}` }
      ]);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsBotTyping(false);
      setSelectedAction("");
      setActionParams({});
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      { sender: "bot", text: "Hello! Select an action from the dropdown or use voice commands to manage schemas, tables, privileges, or optimize your workspace." }
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

  if (!catalogName) {
    return (
      <div className="min-h-screen p-6 relative overflow-auto">
        <style>{movingGradientStyle}</style>
        <BackgroundElements />
        <div className="relative z-10">
          <Navbar 
            navigate={navigate} 
            user={user} 
            selectedWorkspace={selectedWorkspace} 
            setSelectedWorkspace={setSelectedWorkspace} 
            handleLogout={handleLogout} 
            displayName={displayName} 
          />
          <div className="max-w-6xl mx-auto bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-50 shadow-sm">
            <div className="text-center py-10">
              <div className="text-red-500 mb-4">
                <X className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Catalog Not Specified</h3>
              <p className="text-gray-600 mb-6">Please select a catalog first</p>
              <Button 
                onClick={() => navigate('/catalog')}
                className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white"
              >
                Back to Catalogs
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 relative overflow-auto">
        <style>{movingGradientStyle}</style>
        <BackgroundElements />
        <div className="relative z-10">
          <Navbar 
            navigate={navigate} 
            user={user} 
            selectedWorkspace={selectedWorkspace} 
            setSelectedWorkspace={setSelectedWorkspace} 
            handleLogout={handleLogout} 
            displayName={displayName} 
          />
          <div className="max-w-6xl mx-auto bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-50 shadow-sm">
            <div className="text-center py-10">
              <div className="text-red-500 mb-4">
                <X className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Schemas</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative overflow-auto">
      <style>{movingGradientStyle}</style>
      <BackgroundElements />
      
      <div className="relative z-10">
        <Navbar 
          navigate={navigate} 
          user={user} 
          selectedWorkspace={selectedWorkspace} 
          setSelectedWorkspace={setSelectedWorkspace} 
          handleLogout={handleLogout} 
          displayName={displayName} 
        />
        
        <div className="max-w-6xl mx-auto bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-50 shadow-sm">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="ghost" 
                className="text-indigo-600 hover:bg-indigo-50" 
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Catalogs
              </Button>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                Schemas in {catalogName}
              </h2>
            </div>

            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search schemas..."
                className="pl-10 border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Card className="mb-6 border-indigo-50">
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[50%] text-center text-lg font-semibold text-indigo-600">Schema Name</TableHead>
                      <TableHead className="w-[50%] text-center text-lg font-semibold text-indigo-600">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredSchemas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-gray-500">
                          No schemas found in this catalog
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchemas.map((schema) => (
                        <motion.tr 
                          key={schema.name}
                          whileHover={{ backgroundColor: 'rgba(224, 231, 255, 0.3)' }}
                          className="border-b border-indigo-50"
                        >
                          <TableCell className="font-medium w-[50%] text-center text-gray-800">
                            <div className="flex items-center justify-center space-x-2">
                              <span>{schema.name}</span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-indigo-500 hover:bg-indigo-50"
                                onClick={() => navigate(`/tables?catalog=${catalogName}&schema=${schema.name}`)}
                              >
                                View Tables
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-500 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedSchema(schema);
                                  setModalType('delete');
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="w-[50%] text-center text-gray-600">
                            {schema.comment || '-'}
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-indigo-50/50 to-indigo-100/20 border border-indigo-50">
              <CardContent className="text-center">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                  Create New Schema
                </h3>
                <p className="text-gray-600 mt-2 mb-6">
                  Create a new schema to organize your tables and views.
                </p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white px-8 py-3 text-lg rounded-lg shadow-md hover:shadow-lg transition-all"
                    onClick={() => {
                      setSelectedSchema(null);
                      setModalType('create');
                    }}
                  >
                    <Plus className="mr-2 h-5 w-5" /> Add New Schema
                  </Button>
                </motion.div>
              </CardContent>
            </Card>

            {modalType && (
              <SchemaModal
                type={modalType}
                schema={selectedSchema}
                catalogName={catalogName}
                onClose={() => setModalType(null)}
                onSubmit={handleModalSubmit}
              />
            )}
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
}