import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, BarChart, Bar, LineChart, Line, AreaChart, Area,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Database, Layers, Table2, FileText, Activity, Filter, RefreshCw, X,
  Users, Shield, Clock, HardDrive, Cpu, CreditCard, Server, Globe, Box,
  Download, AlertCircle, DatabaseZap, Gauge, Lock, BarChart2, Calendar
} from 'lucide-react';
import { getWorkspaceStats } from './services/api.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const CustomTooltip = ({ active, payload, label, darkMode }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-3 rounded-md shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
        {payload.map((entry, index) => (
          <p key={`tooltip-${index}`} className={`${darkMode ? 'text-gray-300' : 'text-gray-900'}`} style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}{entry.unit || ''}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard({ onClose }) {
  const [timeFilter, setTimeFilter] = useState('week');
  const [darkMode, setDarkMode] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  const fetchData = async () => {
    try {
      setAnimate(true);
      const data = await getWorkspaceStats(timeFilter);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
    } finally {
      setTimeout(() => setAnimate(false), 500);
    }
  };

  const refreshData = () => {
    fetchData();
  };

  const downloadDashboard = () => {
    const dashboardElement = document.getElementById('dashboard-container');
    
    // Get the full scroll height of the dashboard
    const scrollHeight = dashboardElement.scrollHeight;
    
    html2canvas(dashboardElement, {
      scale: 1.5, // Reduced scale for better performance
      useCORS: true,
      allowTaint: true,
      logging: true,
      backgroundColor: darkMode ? '#111827' : '#F9FAFB',
      windowHeight: scrollHeight // Capture full height
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; // Add margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`databricks-dashboard-${new Date().toISOString().slice(0,10)}.pdf`);
    });
  };

  const handleCatalogClick = (data) => {
    if (data && data.name) {
      navigate(`/catalogs/${encodeURIComponent(data.name)}`);
    }
  };

  if (error) {
    return (
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-red-50'} ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p className="font-semibold">Error Loading Dashboard:</p>
        </div>
        <p className="mt-2">{error}</p>
        <button 
          onClick={refreshData}
          className={`mt-4 px-4 py-2 rounded-md flex items-center ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-100 hover:bg-red-200'} transition-colors`}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="mt-4 text-gray-500">Loading Dashboard...</p>
      </div>
    );
  }

  const { 
    totalCatalogs, 
    totalSchemas, 
    totalTables, 
    totalUsers, 
    activeUsers,
    catalogData, 
    tableData, 
    usageData,
    recentQueries,
    recentActivity,
    privilegeDistribution,
    storageByType,
    queryPerformance,
    sensitiveDataAccesses
  } = dashboardData;

  // Calculate accurate metrics from catalog data
  const storageUsage = {
    total: catalogData.reduce((sum, catalog) => sum + catalog.value, 0),
    breakdown: catalogData
  };

  const computeUsage = {
    totalDBUs: usageData.reduce((sum, day) => sum + day.queries, 0) * 0.5, // Adjusted DBU calculation
    dailyUsage: usageData.map(day => ({
      day: day.day,
      DBUs: Math.floor(day.queries * 0.5) // More realistic DBU estimation
    }))
  };

  const dataTransfer = {
    totalInbound: Math.floor(usageData.reduce((sum, day) => sum + day.queries, 0) * 1.2),
    totalOutbound: Math.floor(usageData.reduce((sum, day) => sum + day.queries, 0) * 0.8),
    dailyTransfer: usageData.map(day => ({
      day: day.day,
      inbound: Math.floor(day.queries * 1.2),
      outbound: Math.floor(day.queries * 0.8)
    }))
  };

  const costEstimate = {
    storage: (storageUsage.total * 0.000023).toFixed(2),
    compute: (computeUsage.totalDBUs * 0.22).toFixed(2), // Adjusted to Databricks compute cost
    transfer: ((dataTransfer.totalInbound + dataTransfer.totalOutbound) * 0.0001).toFixed(2) // More realistic transfer cost
  };

  const totalCost = (
    parseFloat(costEstimate.storage) +
    parseFloat(costEstimate.compute) +
    parseFloat(costEstimate.transfer)
  ).toFixed(2);

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#10B981', '#3B82F6', '#84CC16'];

  const themeClasses = darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900';
  const cardClasses = darkMode ? 'bg-gray-800 shadow-xl' : 'bg-white shadow';
  const headerClasses = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  return (
    <div className={`flex flex-col ${themeClasses} transition-colors duration-300 min-h-screen p-4`} id="dashboard-container">
      {/* Header with controls */}
      <div className={`sticky top-0 z-10 border-b ${headerClasses} px-4 py-3 flex justify-between items-center`}>
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold flex items-center">
            <DatabaseZap className="h-5 w-5 mr-2 text-indigo-500" />
            Databricks Workspace Analytics
          </h1>
          <div className="flex space-x-1">
            <button 
              onClick={() => setTimeFilter('day')} 
              className={`px-3 py-1 text-sm rounded-md flex items-center ${timeFilter === 'day' ? 'bg-indigo-600 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
            >
              <Calendar className="h-4 w-4 mr-1" /> Day
            </button>
            <button 
              onClick={() => setTimeFilter('week')} 
              className={`px-3 py-1 text-sm rounded-md flex items-center ${timeFilter === 'week' ? 'bg-indigo-600 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
            >
              <Calendar className="h-4 w-4 mr-1" /> Week
            </button>
            <button 
              onClick={() => setTimeFilter('month')} 
              className={`px-3 py-1 text-sm rounded-md flex items-center ${timeFilter === 'month' ? 'bg-indigo-600 text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
            >
              <Calendar className="h-4 w-4 mr-1" /> Month
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={downloadDashboard}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
            title="Download Dashboard as Multi-Page PDF"
          >
            <Download className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button 
            onClick={refreshData}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
            title="Refresh Data"
          >
            <RefreshCw className={`h-5 w-5 ${animate ? 'animate-spin' : ''} ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <svg className="h-5 w-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
            title="Close Dashboard"
          >
            <X className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className={`${cardClasses} p-4 rounded-lg ${animate ? 'animate-pulse' : ''}`}>
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <Database className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Catalogs</h3>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{totalCatalogs}</p>
              </div>
            </div>
          </div>

          <div className={`${cardClasses} p-4 rounded-lg ${animate ? 'animate-pulse' : ''}`}>
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Layers className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Schemas</h3>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{totalSchemas}</p>
              </div>
            </div>
          </div>

          <div className={`${cardClasses} p-4 rounded-lg ${animate ? 'animate-pulse' : ''}`}>
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-pink-100 text-pink-600">
                <Table2 className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tables</h3>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{totalTables}</p>
              </div>
            </div>
          </div>

          <div className={`${cardClasses} p-4 rounded-lg ${animate ? 'animate-pulse' : ''}`}>
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                <Users className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Users</h3>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{activeUsers}/{totalUsers}</p>
              </div>
            </div>
          </div>

          <div className={`${cardClasses} p-4 rounded-lg ${animate ? 'animate-pulse' : ''}`}>
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Gauge className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Query Success</h3>
                <p className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{queryPerformance.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Storage and Compute Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Storage Usage */}
          <div className={`${cardClasses} p-4 rounded-lg`}>
            <h2 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center`}>
              <HardDrive className="h-4 w-4 mr-2 text-indigo-500" />
              Storage Usage by Catalog (MB)
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={storageUsage.breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    onClick={handleCatalogClick}
                    cursor="pointer"
                  >
                    {storageUsage.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between`}>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Storage</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {(storageUsage.total / 1024).toFixed(2)} GB
                </p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Estimated Cost</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ${costEstimate.storage}/month
                </p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Grants</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {privilegeDistribution.totalGrants.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Compute Usage */}
          <div className={`${cardClasses} p-4 rounded-lg`}>
            <h2 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center`}>
              <Cpu className="h-4 w-4 mr-2 text-blue-500" />
              Compute Usage (DBUs)
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={computeUsage.dailyUsage}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                  <XAxis dataKey="day" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                  <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                  <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                  <Legend />
                  <Bar dataKey="DBUs" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between`}>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total DBUs</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {computeUsage.totalDBUs.toLocaleString()}
                </p>
              </div>
              <div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Estimated Cost</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ${costEstimate.compute}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Transfer and Privileges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Data Transfer */}
          <div className={`${cardClasses} p-4 rounded-lg`}>
            <h2 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center`}>
              <Globe className="h-4 w-4 mr-2 text-green-500" />
              Data Transfer (MB)
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dataTransfer.dailyTransfer}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                  <XAxis dataKey="day" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                  <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                  <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                  <Area type="monotone" dataKey="inbound" stackId="1" stroke="#10B981" fill="#10B981" />
                  <Area type="monotone" dataKey="outbound" stackId="1" stroke="#3B82F6" fill="#3B82F6" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between`}>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Inbound</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {(dataTransfer.totalInbound / 1024).toFixed(2)} GB
                </p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Outbound</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {(dataTransfer.totalOutbound / 1024).toFixed(2)} GB
                </p>
              </div>
            </div>
          </div>

          {/* Privilege Distribution */}
          <div className={`${cardClasses} p-4 rounded-lg`}>
            <h2 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center`}>
              <Lock className="h-4 w-4 mr-2 text-yellow-500" />
              Privilege Distribution
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(privilegeDistribution.byPrivilege)
                    .filter(([_, value]) => value > 0)
                    .map(([name, value]) => ({ name, value }))}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                  <XAxis
                    dataKey="name"
                    stroke={darkMode ? '#9CA3AF' : '#6B7280'}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                  <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                  <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between`}>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Grants</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {privilegeDistribution.totalGrants.toLocaleString()}
                </p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sensitive Accesses</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {sensitiveDataAccesses}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Query Activity and Recent Queries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Query Activity */}
          <div className={`${cardClasses} p-4 rounded-lg`}>
            <h2 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center`}>
              <Activity className="h-4 w-4 mr-2 text-purple-500" />
              Query Activity (Last {timeFilter === 'day' ? 'Day' : timeFilter === 'week' ? 'Week' : 'Month'})
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={usageData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                  <XAxis dataKey="day" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                  <YAxis yAxisId="left" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                  <Tooltip content={<CustomTooltip darkMode={darkMode} />} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="queries"
                    stroke="#6366F1"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between`}>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Queries</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {usageData.reduce((sum, day) => sum + day.queries, 0)}
                </p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Duration</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {queryPerformance.avgDuration.toFixed(2)}s
                </p>
              </div>
            </div>
          </div>

          {/* Recent Queries */}
          <div className={`${cardClasses} p-4 rounded-lg`}>
            <h2 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center`}>
              <FileText className="h-4 w-4 mr-2 text-indigo-500" />
              Recent Queries
            </h2>
            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Query</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
                  {recentQueries.slice(0, 5).map((query, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'} truncate max-w-xs`}>
                          {query.query}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{query.user}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          query.status.toLowerCase() === 'finished'
                            ? 'bg-green-100 text-green-800'
                            : query.status.toLowerCase() === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : query.status.toLowerCase() === 'running'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {query.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{query.duration}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        <div className={`${cardClasses} p-4 rounded-lg`}>
          <h2 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center`}>
            <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
            Cost Estimation Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center mb-1">
                <HardDrive className="h-4 w-4 mr-2 text-indigo-500" />
                <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Storage Cost</p>
              </div>
              <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>${costEstimate.storage}/month</p>
            </div>
            <div className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center mb-1">
                <Cpu className="h-4 w-4 mr-2 text-blue-500" />
                <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Compute Cost</p>
              </div>
              <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>${costEstimate.compute}</p>
            </div>
            <div className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center mb-1">
                <Globe className="h-4 w-4 mr-2 text-green-500" />
                <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Transfer Cost</p>
              </div>
              <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>${costEstimate.transfer}</p>
            </div>
          </div>
          <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Estimated Cost</p>
              <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>${totalCost}/month</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>

  );
}