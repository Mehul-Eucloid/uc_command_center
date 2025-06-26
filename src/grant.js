import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { getAvatarInitials, getAvatarColor } from './components/ui/avatar.js';
import eucloidLogo from "./components/ui/eucloid.png";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { grantPrivileges, revokePrivileges, getCurrentPrivileges, addUserToGroup, getWorkspaceStats, getUsers, getGroups, getCatalogs, getSchemas, getTables, createCatalog, createUser, createGroup, createSchema } from "./services/api";
import { Info, Bell, Settings } from "lucide-react";
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from "framer-motion";
import {
  FaRobot,
  FaTimes,
  FaTrash as FaTrashIcon,
  FaHistory,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";
import { Send } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "./components/ui/table";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue
} from "./components/ui/select";
import { Checkbox } from "./components/ui/checkbox";
import { Search, ArrowLeft, LogOut, ShieldCheck, ShieldOff } from "lucide-react";
import FuzzySet from 'fuzzyset.js';
import { FaTrash } from "react-icons/fa";
import Papa from 'papaparse';

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

function Navbar({ navigate }) {
  const NavLink = ({ to, children, className }) => (
    <button onClick={() => navigate(to)} className={className}>
      {children}
    </button>
  );

  const handleLogout = () => navigate("/");
  const [selectedWorkspace, setSelectedWorkspace] = useState("db_certification");

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
          <NavLink to="/catalog" className="text-lg font-medium text-gray-500 hover:text-indigo-600 transition-colors">
            Catalog
          </NavLink>
          <NavLink
            to="/grant"
            className="text-lg font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
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
        <div className={`w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium border border-indigo-100`}>
          {getAvatarInitials("User")}
        </div>
      </div>
    </nav>
  );
}

const PrivilegeTooltip = () => {
  return (
    <div className="group relative inline-block ml-2">
      <Info className="h-5 w-5 text-indigo-500 hover:text-indigo-700 cursor-pointer transition-colors duration-200" />
      <div className="absolute z-20 left-1/2 transform -translate-x-1/2 bottom-full mb-3 hidden group-hover:block w-80 bg-white border border-indigo-200 rounded-xl shadow-xl p-4">
        <h4 className="text-lg font-semibold text-indigo-700 mb-3">Available Privileges</h4>
        <div className="space-y-4">
          <div>
            <h5 className="text-sm font-medium text-gray-800">Prerequisite</h5>
            <div className="mt-2">
              <table className="w-full text-sm text-gray-700">
                <tbody>
                  <tr className="border-b border-indigo-100">
                    <td className="py-1 font-medium">USE CATALOG</td>
                    <td className="py-1">Required to access a catalog</td>
                  </tr>
                  <tr className="border-b border-indigo-100">
                    <td className="py-1 font-medium">USE SCHEMA</td>
                    <td className="py-1">Required to access a schema</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-medium">APPLY TAG</td>
                    <td className="py-1">Required to apply tags</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-800">Read Privileges</h5>
            <div className="mt-2">
              <table className="w-full text-sm text-gray-700">
                <tbody>
                  <tr className="border-b border-indigo-100">
                    <td className="py-1 font-medium">SELECT</td>
                    <td className="py-1">Read data from tables/views</td>
                  </tr>
                  <tr className="border-b border-indigo-100">
                    <td className="py-1 font-medium">READ VOLUME</td>
                    <td className="py-1">Read files from volumes</td>
                  </tr>
                  <tr className="border-b border-indigo-100">
                    <td className="py-1 font-medium">BROWSE</td>
                    <td className="py-1">List objects in schema</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-medium">REFRESH</td>
                    <td className="py-1">Refresh materialized views</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-800">Create Privileges</h5>
            <div className="mt-2">
              <table className="w-full text-sm text-gray-700">
                <tbody>
                  <tr className="border-b border-indigo-100">
                    <td className="py-1 font-medium">CREATE TABLE</td>
                    <td className="py-1">Create new tables</td>
                  </tr>
                  <tr className="border-b border-indigo-100">
                    <td className="py-1 font-medium">CREATE SCHEMA</td>
                    <td className="py-1">Create new schemas</td>
                  </tr>
                  <tr className="border-b border-indigo-100">
                    <td className="py-1 font-medium">CREATE FUNCTION</td>
                    <td className="py-1">Create SQL functions</td>
                  </tr>
                  <tr className="border-b border-indigo-100">
                    <td className="py-1 font-medium">CREATE MODEL</td>
                    <td className="py-1">Create ML models</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-medium">CREATE VOLUME</td>
                    <td className="py-1">Create storage volumes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 italic">ALL PRIVILEGES gives all privileges on the object</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white" />
      </div>
    </div>
  );
};

const fetchPrincipals = async () => {
  try {
    const [usersResponse, groupsResponse] = await Promise.all([
      getUsers(),
      getGroups(),
    ]);
    const users = usersResponse.map((user) => ({
      id: user.email || user.id || '',
      name: user.name || user.email || '',
      type: 'user'
    }));
    const groups = groupsResponse.map((group) => ({
      id: group.displayName || group.id || '',
      name: group.displayName || group.name || '',
      type: 'group'
    }));
    return { users, groups };
  } catch (error) {
    console.error('Error fetching principals:', error);
    throw new Error('Failed to fetch users and groups');
  }
};

const getPrivilegesForLevel = (level) => {
  const allPrivileges = {
    catalog: [
      { name: 'USE CATALOG', description: 'Grants access to a catalog' },
      { name: 'CREATE SCHEMA', description: 'Allows creating new schemas in the catalog' },
      { name: 'USE SCHEMA', description: 'Grants access to a schema within the catalog' },
      { name: 'CREATE TABLE', description: 'Allows creating new tables' },
      { name: 'MODIFY', description: 'Permits modifying existing objects' },
      { name: 'SELECT', description: 'Allows reading data from tables/views' },
      { name: 'READ VOLUME', description: 'Permits reading files from volumes' },
      { name: 'WRITE VOLUME', description: 'Allows writing files to volumes' },
      { name: 'CREATE FUNCTION', description: 'Permits creating SQL functions' },
      { name: 'CREATE MATERIALIZED VIEW', description: 'Allows creating materialized views' },
      { name: 'CREATE MODEL', description: 'Permits creating machine learning models' },
      { name: 'CREATE MODEL VERSION', description: 'Allows creating new versions of models' },
      { name: 'APPLY TAG', description: 'Permits applying tags to objects' },
      { name: 'BROWSE', description: 'Allows listing objects in a schema' },
      { name: 'ALL PRIVILEGES', description: 'Grants all privileges on the catalog' }
    ],
    schema: [
      { name: 'USE SCHEMA', description: 'Grants access to a schema' },
      { name: 'CREATE TABLE', description: 'Allows creating new tables in the schema' },
      { name: 'CREATE FUNCTION', description: 'Permits creating SQL functions' },
      { name: 'CREATE MATERIALIZED VIEW', description: 'Allows creating materialized views' },
      { name: 'CREATE MODEL', description: 'Permits creating machine learning models' },
      { name: 'CREATE MODEL VERSION', description: 'Allows creating new versions of models' },
      { name: 'MODIFY', description: 'Permits modifying existing objects' },
      { name: 'SELECT', description: 'Allows reading data from tables/views' },
      { name: 'READ VOLUME', description: 'Permits reading files from volumes' },
      { name: 'WRITE VOLUME', description: 'Allows writing files to volumes' },
      { name: 'APPLY TAG', description: 'Permits applying tags to objects' },
      { name: 'BROWSE', description: 'Allows listing objects in the schema' },
      { name: 'REFRESH', description: 'Permits refreshing materialized views' },
      { name: 'ALL PRIVILEGES', description: 'Grants all privileges on the schema' }
    ],
    table: [
      { name: 'SELECT', description: 'Allows reading data from the table' },
      { name: 'MODIFY', description: 'Permits modifying the table' },
      { name: 'READ VOLUME', description: 'Permits reading files from volumes' },
      { name: 'WRITE VOLUME', description: 'Allows writing files to volumes' },
      { name: 'APPLY TAG', description: 'Permits applying tags to the table' },
      { name: 'ALL PRIVILEGES', description: 'Grants all privileges on the table' }
    ]
  };

  return allPrivileges[level] || [];
};

const fetchCatalogs = async () => {
  try {
    const response = await getCatalogs();
    return response.map((catalog) => catalog.name);
  } catch (error) {
    console.error('Error fetching catalogs:', error);
    throw new Error('Failed to fetch catalogs');
  }
};

const fetchSchemas = async (catalogName) => {
  try {
    if (!catalogName) return [];
    const response = await getSchemas(catalogName);
    return response.map((schema) => schema.name);
  } catch (error) {
    console.error('Error fetching schemas:', error);
    throw new Error('Failed to fetch schemas');
  }
};

const fetchTables = async (catalogName, schemaName) => {
  try {
    if (!catalogName || !schemaName) {
      console.log('fetchTables: Missing catalogName or schemaName', { catalogName, schemaName });
      return [];
    }
    const response = await getTables(catalogName, schemaName);
    console.log('fetchTables: Raw response from getTables:', response);
    if (!Array.isArray(response)) {
      console.error('fetchTables: Expected an array of tables, got:', response);
      throw new Error('Invalid response format: Expected an array of tables');
    }
    const tables = response.map((table) => {
      if (!table || typeof table.name !== 'string') {
        console.warn('fetchTables: Invalid table object:', table);
        return null;
      }
      return table.name;
    }).filter(name => name !== null);
    console.log('fetchTables: Processed tables:', tables);
    return tables;
  } catch (error) {
    console.error('fetchTables: Error fetching tables:', error.message, error);
    throw error;
  }
};

export default function GrantPage() {
  const navigate = useNavigate();
  const [principals, setPrincipals] = useState([]);
  const [privileges, setPrivileges] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState("catalog");
  const [catalogName, setCatalogName] = useState("");
  const [schemaName, setSchemaName] = useState("");
  const [tableName, setTableName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("grant");
  const [error, setError] = useState(null);
  const [principalOptions, setPrincipalOptions] = useState({ users: [], groups: [] });
  const [privilegeOptions, setPrivilegeOptions] = useState([]);
  const [catalogOptions, setCatalogOptions] = useState([]);
  const [schemaOptions, setSchemaOptions] = useState([]);
  const [tableOptions, setTableOptions] = useState([]);
  const [principalSearch, setPrincipalSearch] = useState("");
  const [privilegeSearch, setPrivilegeSearch] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState({ principals: false, privileges: false });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [showCSV, setShowCSV] = useState(false);
  const chatContainerRef = useRef(null);
  const principalSearchInputRef = useRef(null);
  const privilegeSearchInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: "Hello! I can help you manage privileges, users, groups, catalogs, schemas, and provide workspace optimization suggestions. Try commands like 'create catalog my_catalog', 'create user', 'grant privileges', or 'optimize workspace'." }
  ]);

  const levelOptions = [
    { value: "catalog", label: "Catalog" },
    { value: "schema", label: "Schema" },
    { value: "table", label: "Table" },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const principalsData = await fetchPrincipals();
        setPrincipalOptions(principalsData);
        const catalogs = await fetchCatalogs();
        setCatalogOptions(catalogs);
      } catch (err) {
        setError("Failed to fetch data from backend");
        console.error("Error fetching initial data:", err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const privileges = getPrivilegesForLevel(selectedLevel);
    setPrivilegeOptions(privileges);
    setPrivileges([]);
  }, [selectedLevel]);

  useEffect(() => {
    const loadSchemas = async () => {
      try {
        const schemas = await fetchSchemas(catalogName);
        setSchemaOptions(schemas);
        setSchemaName("");
        setTableName("");
        setTableOptions([]);
      } catch (err) {
        setError("Failed to fetch schemas");
        console.error("Error fetching schemas:", err);
      }
    };
    if (catalogName) loadSchemas();
  }, [catalogName]);

  useEffect(() => {
    const loadTables = async () => {
      try {
        const tables = await fetchTables(catalogName, schemaName);
        setTableOptions(tables);
        setTableName("");
      } catch (err) {
        setError("Failed to fetch tables");
        console.error("Error fetching tables:", err);
      }
    };
    if (catalogName && schemaName) loadTables();
  }, [catalogName, schemaName]);

  useEffect(() => {
    if (isSelectOpen.principals && principalSearchInputRef.current) {
      setTimeout(() => {
        if (principalSearchInputRef.current) {
          principalSearchInputRef.current.focus();
        }
      }, 100);
    }
  }, [isSelectOpen.principals]);

  useEffect(() => {
    if (isSelectOpen.privileges && privilegeSearchInputRef.current) {
      setTimeout(() => {
        if (privilegeSearchInputRef.current) {
          privilegeSearchInputRef.current.focus();
        }
      }, 100);
    }
  }, [isSelectOpen.privileges]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const filteredUsers = principalOptions.users.filter((user) =>
    (user.name || '').toLowerCase().includes(principalSearch.toLowerCase())
  );
  const filteredGroups = principalOptions.groups.filter((group) =>
    (group.name || '').toLowerCase().includes(principalSearch.toLowerCase())
  );
  const filteredPrivileges = privilegeOptions.filter((privilege) =>
    privilege.name.toLowerCase().includes(privilegeSearch.toLowerCase())
  );

  const handleRemovePrincipal = (principalId, e) => {
    e.stopPropagation();
    setPrincipals((prevPrincipals) =>
      prevPrincipals.filter((p) => p.id !== principalId)
    );
  };

  const handlePrincipalSelect = (principal, checked) => {
    setPrincipals((prevPrincipals) => {
      if (checked) {
        return [...prevPrincipals, principal];
      } else {
        return prevPrincipals.filter((p) => p.id !== principal.id);
      }
    });
  };

  const handlePrivilegeSelect = (privilegeName, checked) => {
    setPrivileges((prevPrivileges) => {
      if (checked) {
        return [...prevPrivileges, privilegeName];
      } else {
        return prevPrivileges.filter((p) => p !== privilegeName);
      }
    });
  };

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    setIsUploadingCSV(true);
    setError(null);
    setCsvData([]);
    setShowCSV(false);
  
    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (result) => {
          const data = result.data.filter(row => row.name && row.email && row.group);
          if (data.length === 0) {
            setError("CSV file is empty or invalid (no valid rows)");
            toast.error("CSV file is empty or invalid (no valid rows)");
            setIsUploadingCSV(false);
            return;
          }
  
          setCsvData(data);
  
          const newPrincipals = [...principals];
          const createdUsers = [];
          const createdGroups = [];
          const addedToGroups = [];
  
          // Process all rows first
          for (const row of data) {
            const name = row.name.trim();
            const email = row.email.trim();
            const groupName = row.group.trim();
  
            try {
              // Create user if not exists
              let user = principalOptions.users.find(u => u.id === email);
              if (!user) {
                await createUser({ email, displayName: name });
                user = { id: email, name, type: 'user' };
                createdUsers.push(email);
                setPrincipalOptions(prev => ({
                  ...prev,
                  users: [...prev.users, user]
                }));
              }
  
              // Create group if not exists
              let group = principalOptions.groups.find(g => g.id === groupName);
              if (!group) {
                await createGroup({ name: groupName });
                group = { id: groupName, name: groupName, type: 'group' };
                createdGroups.push(groupName);
                setPrincipalOptions(prev => ({
                  ...prev,
                  groups: [...prev.groups, group]
                }));
              }
  
              // Add user to group
              await addUserToGroup({ userId: email, groupName });
              addedToGroups.push(`${email} → ${groupName}`);
  
              // Add to principals if not already present
              if (!newPrincipals.some(p => p.id === user.id)) {
                newPrincipals.push(user);
              }
              if (!newPrincipals.some(p => p.id === group.id)) {
                newPrincipals.push(group);
              }
            } catch (err) {
              console.error(`Error processing row ${JSON.stringify(row)}:`, err);
              toast.error(`Error processing ${email}: ${err.message}`);
            }
          }
  
          setPrincipals(newPrincipals);
          
          // Show comprehensive success message
          let successMsg = 'CSV processed successfully. ';
          if (createdUsers.length > 0) successMsg += `Created users: ${createdUsers.join(', ')}. `;
          if (createdGroups.length > 0) successMsg += `Created groups: ${createdGroups.join(', ')}. `;
          if (addedToGroups.length > 0) successMsg += `Added to groups: ${addedToGroups.join('; ')}.`;
          
          toast.success(successMsg, { autoClose: 5000 });
          setIsUploadingCSV(false);
          fileInputRef.current.value = null;
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
          toast.error(`Error parsing CSV: ${error.message}`);
          setIsUploadingCSV(false);
        }
      });
    } catch (err) {
      setError(`Error processing CSV: ${err.message}`);
      toast.error(`Error processing CSV: ${err.message}`);
      setIsUploadingCSV(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
  
    try {
      if (!principals.length) throw new Error('At least one principal is required');
      if (!privileges.length) throw new Error('At least one privilege is required');
      if (!selectedLevel) throw new Error('Level is required');
      if (!catalogName) throw new Error('Catalog name is required');
  
      let securableType, fullName;
      switch (selectedLevel) {
        case 'catalog':
          securableType = 'catalog';
          fullName = catalogName;
          break;
        case 'schema':
          if (!schemaName) throw new Error('Schema name is required');
          securableType = 'schema';
          fullName = `${catalogName}.${schemaName}`;
          break;
        case 'table':
          if (!schemaName) throw new Error('Schema name is required');
          if (!tableName) throw new Error('Table name is required');
          securableType = 'table';
          fullName = `${catalogName}.${schemaName}.${tableName}`;
          break;
        default:
          throw new Error('Invalid level selected');
      }
  
      // Process all principals in parallel
      const results = await Promise.allSettled(
        principals.map(principal => 
          activeTab === 'grant'
            ? grantPrivileges({
                securable_type: securableType,
                full_name: fullName,
                principal: principal.id,
                principal_type: principal.type,
                privileges
              })
            : revokePrivileges({
                securable_type: securableType,
                full_name: fullName,
                principal: principal.id,
                principal_type: principal.type,
                privileges
              })
        )
      );
  
      // Check for any failures
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        const errorMessages = failures.map(f => f.reason.message).join('\n');
        throw new Error(`Some operations failed:\n${errorMessages}`);
      }
  
      setSuccess(true);
      if (activeTab === 'grant') {
        setPrincipals([]);
        setPrivileges([]);
        setCatalogName('');
        setSchemaName('');
        setTableName('');
      }
      
      toast.success(activeTab === 'grant'
        ? `Privileges ${privileges.join(', ')} granted successfully to all ${principals.length} principals!`
        : `Privileges ${privileges.join(', ')} revoked successfully from all ${principals.length} principals!`);
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const commandKeywords = [
    "create", "catalog", "user", "group", "schema", "in", "grant", "revoke", "privileges", "to", "from", "on",
    "optimize", "workspace", "business", "insights", "suggestions", "improve"
  ];

  const fuzzySet = FuzzySet(commandKeywords);

  const correctSpelling = (input) => {
    const words = input.toLowerCase().split(/\s+/);
    const correctedWords = words.map(word => {
      const match = fuzzySet.get(word);
      if (match && match[0][0] > 0.7) {
        return match[0][1];
      }
      return word;
    });
    return correctedWords.join(" ");
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

      const privilegeChartData = Object.entries(privilegeDistribution.byPrivilege || {}).map(([name, value]) => ({
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
    if (!chatInput.trim()) return;

    setSearchHistory((prev) => [...prev, chatInput].slice(-10));
    setChatMessages((prev) => [...prev, { sender: "user", text: chatInput }]);
    let input = chatInput.trim().toLowerCase();
    setChatInput("");
    setIsBotTyping(true);

    input = correctSpelling(input);

    try {
      if (input.startsWith("create catalog")) {
        const match = input.match(/create catalog\s+(.+)/);
        if (!match) {
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Please provide a catalog name. Usage: create catalog <name>" }
          ]);
          return;
        }
        const catalogName = match[1].trim();
        await createCatalog({ name: catalogName, comment: `Created via chatbot on ${new Date().toISOString()}` });
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Catalog '${catalogName}' created successfully!` }
        ]);
        const updatedCatalogs = await fetchCatalogs();
        setCatalogOptions(updatedCatalogs);
      } else if (input.startsWith("create user")) {
        const match = input.match(/create user\s+(.+)/);
        let email = "default@example.com";
        let displayName = "New User";
        if (match) {
          email = match[1].trim();
          displayName = email.split("@")[0];
        }
        const userData = { email, displayName };
        await createUser(userData);
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `User '${email}' created successfully!` }
        ]);
        const principalsData = await fetchPrincipals();
        setPrincipalOptions(principalsData);
      } else if (input.startsWith("create group")) {
        const match = input.match(/create group\s+(.+)/);
        if (!match) {
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Please provide a group name. Usage: create group <name>" }
          ]);
          return;
        }
        const groupName = match[1].trim();
        await createGroup({ name: groupName });
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Group '${groupName}' created successfully!` }
        ]);
        const principalsData = await fetchPrincipals();
        setPrincipalOptions(principalsData);
      } else if (input.startsWith("create schema")) {
        const match = input.match(/create schema\s+(.+)\s+in catalog\s+(.+)/);
        if (!match) {
          setChatMessages((prev) => [
            ...prev,
            { sender: "bot", text: "Please provide a schema name and catalog. Usage: create schema <schema_name> in catalog <catalog_name>" }
          ]);
          return;
        }
        const schemaName = match[1].trim();
        const catalogName = match[2].trim();
        await createSchema({ catalogName, name: schemaName, comment: `Created via chatbot on ${new Date().toISOString()}` });
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: `Schema '${schemaName}' created in catalog '${catalogName}' successfully!` }
        ]);
        if (catalogName === catalogName) {
          const schemas = await fetchSchemas(catalogName);
          setSchemaOptions(schemas);
        }
      } else if (input.includes("revoke privileges") || input.includes("remove privileges")) {
        const match = input.match(/revoke privileges\s+(.+?)\s+from\s+(.+?)\s+on\s+(\w+)\s+(.+)/i);
        if (!match) {
          setChatMessages((prevMessages) => [
            ...prevMessages,
            { sender: "bot", text: "Please provide privileges, principal, securable type, and name. Usage: revoke privileges <privileges> from <principal> on <securable_type> <name>" }
          ]);
          return;
        }
        const privileges = match[1].split(',').map(p => p.trim().toUpperCase());
        const principal = match[2].trim();
        const securable_type = match[3].trim().toUpperCase();
        const full_name = match[4].trim();
        try {
          await revokePrivileges({
            securable_type,
            full_name,
            principal,
            principal_type: principal.includes('@') ? 'user' : 'group',
            privileges
          });
          setChatMessages((prevMessages) => [
            ...prevMessages,
            { sender: "bot", text: `Privileges '${privileges.join(", ")}' revoked from '${principal}' on ${securable_type} '${full_name}' successfully!` }
          ]);
          toast.success(`Privileges '${privileges.join(', ')}' revoked successfully!`);
        } catch (error) {
          setChatMessages((prevMessages) => [
            ...prevMessages,
            { sender: "bot", text: `Error revoking privileges: ${error.message}` }
          ]);
          toast.error(`Error revoking privileges: ${error.message}`)
        }
    } else if (input.startsWith("revoke privileges")) {
      const match = input.match(/revoke privileges\s+(.+)\s+from\s+(.+)\s+on\s+(.+)\s+(.+)/);
      if (!match) {
        setChatMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Please provide privileges, principal, secursville type, and name. Usage: revoke privileges <privileges> from <principal> on <securable_type> <name>" }
        ]);
        return;
      }
      const privileges = match[1].split(",").map(p => p.trim().toUpperCase());
      const principal = match[2].trim();
      const securable_type = match[3].trim().toUpperCase();
      const full_name = match[4].trim();
      await revokePrivileges({
        securable_type,
        full_name,
        principal,
        privileges,
        principal_type: principal.includes('@') ? 'user' : 'group'
      });
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Privileges '${privileges.join(", ")}' revoked from '${principal}' on ${securable_type} '${full_name}' successfully!` }
      ]);
      toast.success(`Privileges '${privileges.join(", ")}' revoked successfully!`);
    } else if (input.includes("optimize") || input.includes("workspace") || input.includes("business") || input.includes("suggestions") || input.includes("improve")) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Analyzing your workspace for optimization opportunities..." }
      ]);
      const insights = await generateWorkspaceInsights();
      let responseText = "Here are your recommendations for optimizing your workspace:\n\n";
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
    } else {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: "I didn't understand that command. Try 'create catalog <name>', 'create user', 'create group <name>', 'create schema <schema_name> in catalog <catalog_name>', 'grant privileges <privileges> to <principal> on <securable_type> <name>', quellright, privileges <privilege> from <principal> on <securable_type> <name>', or 'optimize workspace'." }
      ]);
    }
  } catch (error) {
    setChatMessages((prev) => [
      ...prev,
      { sender: "bot", text: `Error: ${error.message}` }
    ]);
    toast.error(`Error: ${error.message}`);
  } finally {
    setIsBotTyping(false);
  }
};

const handleClearChat = () => {
  setChatMessages([
    { sender: "bot", text: "Hello! I can help you manage privileges, users, groups, catalogs, schemas, and provide workspace optimization suggestions. Try commands like 'create catalog my_catalog', 'create user', 'grant privileges', or 'optimize workspace'." }
  ]);
  setSearchHistory([]);
};

const quickActions = [
  { label: "Create Catalog", command: "create catalog new_catalog" },
  { label: "Create User", command: "create user" },
  { label: "Create Group", command: "create group new_group" },
  { label: "Grant Privileges", command: "grant privileges SELECT to user1 on catalog my_catalog" },
  { label: "Revoke Privileges", command: "revoke privileges SELECT from user1 on catalog my_catalog" },
  { label: "Optimize Workspace", command: "optimize workspace" }
];

const handleQuickAction = (command) => {
  setChatInput(command);
  handleChatSubmit({ preventDefault: () => { } });
};

const handleHistoryClick = (historyItem) => {
  setChatInput(historyItem);
  handleChatSubmit({ preventDefault: () => { } });
};

const displayName = "User";

return (
  <div className="min-h-screen p-6 relative overflow-hidden">
    <style>{movingGradientStyle}</style>
    <BackgroundElements />

    <div className="relative z-10">
      <Navbar navigate={navigate} />

      <div className="max-w-6xl mx-auto bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-indigo-50 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent text-center">
              {activeTab === "grant" ? "Grant Privileges" : "Revoke Privileges"}
            </h2>
            <p className="text-gray-600 mt-2>Manage access permissions for your data assets"></p>
          </div>

          <Card className="border-indigo-50 mb-6">
            <CardContent className="p-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                  {error}
                </motion.div>
              )}

              <div className="flex mb-6 border-b border-indigo-100">
                <button
                  className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium transition-colors ${activeTab === "grant"
                      ? "border-green-500 text-green-600 bg-green-50"
                      : "border-transparent text-gray-500 hover:text-green-600 hover:bg-green-50"
                    } rounded-t-lg`}
                  onClick={() => setActiveTab("grant")}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span class="text-sm">Grant Privileges</span>
                </button>
                <button
                  className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium transition-colors ${activeTab === "revoke"
                      ? "border-red-500 text-red-600 bg-red-50"
                      : "border-transparent text-gray-500 hover:text-red-600 hover:bg-red-50"
                    } rounded-t-lg`}
                  onClick={() => setActiveTab("revoke")}
                >
                  <ShieldOff className="h-4 w-4" />
                  <span className="text-sm">Revoke Privileges</span>
                </button>

              </div>

              <form onSubmit={handleSubmit} class="space-y-4">
                <div class="space-y-4">
                  <label class="block text-sm font-semibold text-gray-700">Upload CSV (name, email, group)</label>
                  <div class="flex items-center space-x-4">
                    <Input
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      onChange={handleCSVUpload}
                      className="border border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg"
                      disabled={isUploadingCSV}
                    />
                    {isUploadingCSV && (
                      <svg class="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 018 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                  </div>
                  <p class="text-xs text-gray-500 mt-2">
                    Upload a CSV with 'name', 'email', and 'group' columns to add users and groups. Non-existent users or groups will be created.
                  </p>

                  {csvData.length > 0 && (
                    <div class="mt-4">
                      <Button
                        type="button"
                        onClick={() => setShowCSV(!showCSV)}
                        class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                      >
                        {showCSV ? 'Hide CSV Content' : 'Show CSV Content'}
                      </Button>
                      {showCSV && (
                        <div class="mt-4 border border-indigo-200 rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead class="bg-indigo-50 text-gray-800">Name</TableHead>
                                <TableHead class="bg-indigo-50 text-gray-800">Email</TableHead>
                                <TableHead class="bg-indigo-50 text-gray-800">Group</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csvData.map((row, index) => (
                                <TableRow key={index}>
                                  <TableCell>{row.name}</TableCell>
                                  <TableCell>{row.email}</TableCell>
                                  <TableCell>{row.group}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Principals *
                  </label>
                  <Select
                    onOpenChange={(open) => setIsSelectOpen((prev) => ({ ...prev, principals: open }))}
                  >
                    <SelectTrigger className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg bg-white/50">
                      <SelectValue placeholder={principals.length > 0
                        ? `${principals.length} selected`
                        : "Select principals"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-indigo-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                      <div className="p-4">
                        <div className="mb-4">
                          <Input
                            ref={principalSearchInputRef}
                            type="text"
                            placeholder="Search users or groups..."
                            value={principalSearch}
                            onChange={(e) => setPrincipalSearch(e.target.value)}
                            className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg"
                          />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Users</h3>
                            <div className="grid grid-cols-4 gap-2">
                              {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                  <div key={user.id} className="flex items-center space-x-3 p-2 hover:bg-indigo-50 rounded-lg">
                                    <Checkbox
                                      checked={principals.some(p => p.id === user.id)}
                                      onCheckedChange={(checked) => handlePrincipalSelect(user, checked)}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{user.name || 'Unnamed User'}</p>
                                      <p className="text-xs text-gray-500 truncate">{user.id || 'No ID'}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500 col-span-4">Loading Users</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Groups</h3>
                            <div className="grid grid-cols-4 gap-2">
                              {filteredGroups.length > 0 ? (
                                filteredGroups.map((group) => (
                                  <div key={group.id} className="flex items-center space-x-3 p-2 hover:bg-indigo-50 rounded-lg">
                                    <Checkbox
                                      checked={principals.some(p => p.id === group.id)}
                                      onCheckedChange={(checked) => handlePrincipalSelect(group, checked)}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{group.name || 'Unnamed Group'}</p>
                                      <p className="text-xs text-gray-500 truncate">{group.id || 'No ID'}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500 col-span-4">Loading groups</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SelectContent>
                  </Select>

                  {principals.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {principals.map((principal) => (
                        <span
                          key={principal.id}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                        >
                          {principal.name || 'Unnamed Principal'}
                          <button
                            type="button"
                            onClick={(e) => handleRemovePrincipal(principal.id, e)}
                            className="ml-2 text-indigo-600 hover:text-indigo-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <label className="block text-sm font-semibold text-gray-800">
                      Privileges *
                    </label>
                    <PrivilegeTooltip />
                  </div>

                  <Select
                    onOpenChange={(open) => setIsSelectOpen((prev) => ({ ...prev, privileges: open }))}
                  >
                    <SelectTrigger className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg bg-white/50">
                      <SelectValue placeholder={privileges.length > 0
                        ? `${privileges.length} selected`
                        : "Select privileges"} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-indigo-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                      <div className="p-4">
                        <div className="mb-4">
                          <Input
                            ref={privilegeSearchInputRef}
                            type="text"
                            placeholder="Search privileges..."
                            value={privilegeSearch}
                            onChange={(e) => setPrivilegeSearch(e.target.value)}
                            className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg"
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                        {filteredPrivileges.length > 0 ? (
  filteredPrivileges.map((privilege) => (
    <div key={privilege.name} className="group relative flex items-center space-x-3 p-2 hover:bg-indigo-50 rounded-lg">
      <Checkbox
        checked={privileges.includes(privilege.name)}
        onCheckedChange={(checked) => handlePrivilegeSelect(privilege.name, checked)}
      />
      <span className="text-sm font-medium text-gray-900">{privilege.name}</span>
      <div className="absolute z-10 left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-white border border-indigo-200 rounded-lg shadow-lg p-2">
        <p className="text-xs text-gray-700">{privilege.description}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white" />
      </div>
    </div>
  ))
) : (
  <p className="text-sm text-gray-500 col-span-4">No privileges found</p>
)}
                        </div>
                      </div>
                    </SelectContent>
                  </Select>

                  {privileges.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {privileges.map((privilege) => (
                        <span
                          key={privilege}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                        >
                          {privilege}
                          <button
                            type="button"
                            onClick={() => setPrivileges(privileges.filter((p) => p !== privilege))}
                            className="ml-2 text-indigo-600 hover:text-indigo-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-indigo-700 mb-4">Access Level</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {levelOptions.map((option) => (
                      <motion.div
                        key={option.value}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div
                          className={`border-2 cursor-pointer transition-all duration-200 rounded-lg p-4 flex items-center ${selectedLevel === option.value
                              ? "border-indigo-500 bg-indigo-50 shadow-md"
                              : "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50"
                            }`}
                          onClick={() => setSelectedLevel(option.value)}
                        >
                          <input
                            type="radio"
                            checked={selectedLevel === option.value}
                            className="mr-3 h-5 w-5 text-indigo-600 border-indigo-300 focus:ring-indigo-500"
                            onChange={() => { }}
                          />
                          <span className="font-semibold text-gray-800">{option.label}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {selectedLevel && (
                  <div className="space-y-4">
                    {selectedLevel === "catalog" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Catalog Name *
                        </label>
                        <Select value={catalogName} onValueChange={setCatalogName}>
                          <SelectTrigger className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg bg-white/50">
                            <SelectValue placeholder="Select catalog" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-indigo-200 rounded-lg shadow-lg">
                            {catalogOptions.map((catalog) => (
                              <SelectItem key={catalog} value={catalog}>
                                {catalog}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(selectedLevel === "schema" || selectedLevel === "table") && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Catalog Name *
                        </label>
                        <Select value={catalogName} onValueChange={setCatalogName}>
                          <SelectTrigger className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg bg-white/50">
                            <SelectValue placeholder="Select catalog" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-indigo-200 rounded-lg shadow-lg">
                            {catalogOptions.map((catalog) => (
                              <SelectItem key={catalog} value={catalog}>
                                {catalog}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedLevel === "schema" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Schema Name *
                        </label>
                        <Select value={schemaName} onValueChange={setSchemaName}>
                          <SelectTrigger className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg bg-white/50">
                            <SelectValue placeholder="Select schema" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-indigo-200 rounded-lg shadow-lg">
                            {schemaOptions.map((schema) => (
                              <SelectItem key={schema} value={schema}>
                                {schema}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedLevel === "table" && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Schema Name *
                          </label>
                          <Select value={schemaName} onValueChange={setSchemaName}>
                            <SelectTrigger className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg bg-white/50">
                              <SelectValue placeholder="Select schema" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-indigo-200 rounded-lg shadow-lg">
                              {schemaOptions.map((schema) => (
                                <SelectItem key={schema} value={schema}>
                                  {schema}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Table Name *
                          </label>
                          <Select value={tableName} onValueChange={setTableName}>
                            <SelectTrigger className="w-full border-indigo-200 focus:border-indigo-400 focus:ring-indigo-300 rounded-lg bg-white/50">
                              <SelectValue placeholder="Select table" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-indigo-200 rounded-lg shadow-lg">
                              {tableOptions.map((table) => (
                                <SelectItem key={table} value={table}>
                                  {table}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-6"
                >
                  <Button
                    type="submit"
                    className={`w-full py-3 text-lg font-semibold rounded-lg shadow-lg ${activeTab === "grant"
                        ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
                        : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                      } text-white transition-all duration-200`}
                    disabled={isSubmitting || isUploadingCSV}
                  >

                    {isSubmitting ? (
                      <span class="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      activeTab === "grant" ? "GRANT PRIVILEGES" : "REVOKE PRIVILEGES"
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>

    {/* Success Notification */}
    {success && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 right-6"
      >
        <Card className={`${activeTab === "grant"
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
          } shadow-lg`}>
          <CardContent className="p-4 flex items-center">
            <div className={`${activeTab === "grant"
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
              } p-2 rounded-full mr-3`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium">
                {activeTab === "grant" ? "Privileges Granted" : "Privileges Revoked"}
              </h4>
              <p className="text-sm">
                {activeTab === "grant"
                  ? `Successfully granted ${privileges.join(', ')} on ${selectedLevel} ${catalogName}${selectedLevel === 'schema' ? `.${schemaName}` : ''}${selectedLevel === 'table' ? `.${schemaName}.${tableName}` : ''} to ${principals.map(p => p.name).join(', ')}`
                  : `Successfully revoked ${privileges.join(', ')} on ${selectedLevel} ${catalogName}${selectedLevel === 'schema' ? `.${schemaName}` : ''}${selectedLevel === 'table' ? `.${schemaName}.${tableName}` : ''} from ${principals.map(p => p.name).join(', ')}`}
              </p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="ml-4 text-gray-600 hover:text-gray-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </CardContent>
        </Card>
      </motion.div>
    )}


    <div class="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isChatOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            class="relative flex flex-col items-center"
          >
            <motion.div
              class="flex items-center space-x-2 mb-2 bg-indigo-600 text-white text-sm rounded-lg p-2 shadow-lg z-50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <AnimatedHand />
              <span class="text-sm">Hi, I am Here to Help!</span>
            </motion.div>
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                transition: { duration: 1.5, repeat: 'Infinity', ease: 'easeInOut' }
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              class="relative"
            >
              <div class="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 opacity-50 blur-lg animate-pulse" />
              <Button
                onClick={() => setIsChatOpen(true)}
                class="relative bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-full p-4 shadow-xl hover:shadow-2xl hover:from-indigo-700 hover:to-indigo-600 transition-all duration-300"
                aria-label="Open chatbot"
              >
                <FaRobot class="h-7 w-7" />
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
            className="relative w-[700px] h-[500px] rounded-lg shadow-2xl border border-indigo-200 flex flex-col overflow-hidden bg-white"
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
                        {item}
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
                      className={`mb-4 flex ${message.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                    >
                      <div
                        className={`flex items-start space-x-2 max-w-[70%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                          }`}
                      >
                        {message.sender === "bot" && (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium bg-indigo-500">
                            <FaRobot className="h-5 w-5" />
                          </div>
                        )}
                        <div
                          className={`p-3 rounded-lg shadow-sm ${message.sender === "user"
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
                    onClick={() => handleQuickAction(action.command)}
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
              <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Say Something..."
                  className="flex-1 p-2.5 border border-indigo-400 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800 text-sm transition-all placeholder:text-gray-400"
                  aria-label="Chat input"
                />
                <Button
                  type="submit"
                  className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-full p-2.5 shadow-sm hover:shadow-md transition-all"
                  disabled={!chatInput.trim()}
                  aria-label="Send message"
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
);
}