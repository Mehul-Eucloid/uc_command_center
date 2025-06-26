import React, { useState, useEffect } from "react";
import { getCatalogStats, getCatalogPrivileges } from "./services/api.js";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "./components/ui/dialog.js";
import { Button } from "./components/ui/button.js";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "./components/ui/card.js";
import { Database, User, Clock, Table, Activity, Shield } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const TABLE_TYPE_COLORS = {
  MANAGED: '#4f46e5',
  EXTERNAL: '#8b5cf6',
  VIEW: '#3b82f6',
  OTHER: '#6b7280'
};

const SCHEMA_ACTIVITY_COLORS = {
  0: '#4f46e5',
  1: '#8b5cf6',
  2: '#3b82f6',
  3: '#10b981',
  4: '#f59e0b'
};

const ENTITLEMENT_COLORS = {
  USE_CATALOG: '#4f46e5',
  CREATE_SCHEMA: '#8b5cf6',
  SELECT: '#3b82f6',
  MODIFY: '#10b981',
  ALL_PRIVILEGES: '#f59e0b',
  OTHER: '#6b7280'
};

export function CatalogStatsModal({ catalogName, isOpen, onClose }) {
  const [catalogStats, setCatalogStats] = useState(null);
  const [privilegeStats, setPrivilegeStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const fetchData = async () => {
      if (!catalogName) return;
      
      try {
        setIsLoading(true);
        setError(null);

        const [stats, privileges] = await Promise.all([
          getCatalogStats(catalogName),
          getCatalogPrivileges(catalogName)
        ]);

        setCatalogStats(stats);
        setPrivilegeStats(privileges);
      } catch (err) {
        console.error('Error fetching catalog data:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load catalog data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [catalogName]);

  const prepareTableTypeChartData = () => {
    if (!catalogStats?.tableTypes) return [];
    
    const chartData = Object.entries(catalogStats.tableTypes)
      .map(([name, value]) => ({
        name,
        value: Number(value) || 0
      }))
      .filter(item => item.value > 0);

    return chartData.length > 0 ? chartData : [{ name: 'No Data', value: 1 }];
  };

  const hasTableTypeData = () => {
    return catalogStats?.tableTypes && Object.values(catalogStats.tableTypes).some(val => val > 0);
  };

  const prepareSchemaActivityChartData = () => {
    if (!catalogStats?.schemaActivity) return [];

    const chartData = catalogStats.schemaActivity
      .map(schema => ({
        name: schema.name,
        value: schema.recentActivity || 0
      }))
      .filter(item => item.value > 0);

    return chartData.length > 0 ? chartData : [{ name: 'No Data', value: 1 }];
  };

  const hasSchemaActivityData = () => {
    return catalogStats?.schemaActivity && catalogStats.schemaActivity.some(schema => schema.recentActivity > 0);
  };

  const prepareEntitlementChartData = () => {
    if (!privilegeStats?.byPrivilege) return [];

    const chartData = Object.entries(privilegeStats.byPrivilege)
      .map(([name, value]) => ({
        name,
        value: Number(value) || 0
      }))
      .filter(item => item.value > 0);

    return chartData.length > 0 ? chartData : [{ name: 'No Data', value: 1 }];
  };

  const hasEntitlementData = () => {
    return privilegeStats?.byPrivilege && Object.values(privilegeStats.byPrivilege).some(val => val > 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white rounded-lg border border-indigo-100">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b border-indigo-100">
          <DialogTitle className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
            Catalog Statistics: {catalogName}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Overview of statistics and information for this catalog
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-md">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Navigation Buttons */}
              <div className="flex justify-center space-x-2 mb-4">
                <Button
                  onClick={() => setActiveSection("overview")}
                  className={`${
                    activeSection === "overview"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  } hover:bg-indigo-500 hover:text-white`}
                >
                  Overview
                </Button>
                <Button
                  onClick={() => setActiveSection("tableTypes")}
                  className={`${
                    activeSection === "tableTypes"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  } hover:bg-indigo-500 hover:text-white`}
                >
                  Table Types
                </Button>
                <Button
                  onClick={() => setActiveSection("schemaActivity")}
                  className={`${
                    activeSection === "schemaActivity"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  } hover:bg-indigo-500 hover:text-white`}
                >
                  Schema Activity
                </Button>
                <Button
                  onClick={() => setActiveSection("entitlements")}
                  className={`${
                    activeSection === "entitlements"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  } hover:bg-indigo-500 hover:text-white`}
                >
                  Entitlements
                </Button>
              </div>

              {/* Overview Section */}
              {activeSection === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="border border-indigo-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600 flex items-center">
                          <Database className="h-4 w-4 mr-2 text-indigo-500" />
                          Schemas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-indigo-600">{catalogStats?.schemaCount || 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="border border-indigo-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600 flex items-center">
                          <Database className="h-4 w-4 mr-2 text-indigo-500" />
                          Tables
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold text-indigo-600">{catalogStats?.tableCount || 0}</p>
                      </CardContent>
                    </Card>
                    <Card className="border border-indigo-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600 flex items-center">
                          <User className="h-4 w-4 mr-2 text-indigo-500" />
                          Created By
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-md font-medium text-gray-800 truncate" title={catalogStats?.createdBy || 'System'}>
                          {catalogStats?.createdBy || 'System'}
                        </p>
                        <p className="text-xs text-gray-500">{catalogStats?.createdOn || 'Unknown'}</p>
                      </CardContent>
                    </Card>
                    <Card className="border border-indigo-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600 flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-indigo-500" />
                          Last Modified
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-md font-medium text-gray-800">{catalogStats?.lastModified || 'Never'}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
              
              {/* Table Types Section */}
              {activeSection === "tableTypes" && (
                <div className="space-y-4">
                  <Card className="border border-indigo-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600 flex items-center">
                        <Table className="h-4 w-4 mr-2 text-indigo-500" />
                        Table Type Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        {hasTableTypeData() ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={prepareTableTypeChartData()}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {prepareTableTypeChartData().map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={TABLE_TYPE_COLORS[entry.name] || TABLE_TYPE_COLORS.OTHER}
                                  />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value, name) => [`${value} tables`, name]} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            No table type data available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {hasTableTypeData() && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Table Type Breakdown</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {catalogStats?.tableTypes && Object.entries(catalogStats.tableTypes).map(([type, count]) => (
                          count > 0 && (
                            <div
                              key={type}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-50 shadow-sm"
                            >
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{ backgroundColor: TABLE_TYPE_COLORS[type] || TABLE_TYPE_COLORS.OTHER }}
                                ></div>
                                <span className="text-sm font-medium text-gray-700">{type}</span>
                              </div>
                              <span className="text-sm font-bold text-indigo-600">{count}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Schema Activity Section */}
              {activeSection === "schemaActivity" && (
                <div className="space-y-4">
                  <Card className="border border-indigo-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600 flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-indigo-500" />
                        Schema Activity (Last 30 Days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        {hasSchemaActivityData() ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={prepareSchemaActivityChartData()}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {prepareSchemaActivityChartData().map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={SCHEMA_ACTIVITY_COLORS[index % Object.keys(SCHEMA_ACTIVITY_COLORS).length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value, name) => [`${value} updates`, name]} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            No recent schema activity available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {catalogStats?.schemaActivity && catalogStats.schemaActivity.length > 0 ? (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Schema Activity Breakdown</h3>
                      <div className="space-y-3">
                        {catalogStats.schemaActivity.map(schema => (
                          <div
                            key={schema.name}
                            className="flex justify-between items-center p-2 border-b border-gray-100"
                          >
                            <div className="flex items-center">
                              <Database className="h-4 w-4 mr-2 text-indigo-500" />
                              <span className="text-sm text-gray-700">{schema.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-800">
                                {schema.recentActivity} recent updates
                              </p>
                              <p className="text-xs text-gray-500">
                                {schema.tableCount} total tables
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No recent schema activity found.
                    </div>
                  )}
                </div>
              )}

              {/* Entitlements Section */}
              {activeSection === "entitlements" && (
                <div className="space-y-4">
                  <Card className="border border-indigo-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600 flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-indigo-500" />
                        Entitlements Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        {hasEntitlementData() ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={prepareEntitlementChartData()}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {prepareEntitlementChartData().map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={ENTITLEMENT_COLORS[entry.name] || ENTITLEMENT_COLORS.OTHER}
                                  />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value, name) => [`${value} grants`, name]} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            No entitlement data available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {hasEntitlementData() && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Entitlement Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {privilegeStats?.byPrivilege && Object.entries(privilegeStats.byPrivilege).map(([privilege, count]) => (
                          count > 0 && (
                            <div
                              key={privilege}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-50 shadow-sm"
                            >
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{ backgroundColor: ENTITLEMENT_COLORS[privilege] || ENTITLEMENT_COLORS.OTHER }}
                                ></div>
                                <span className="text-sm font-medium text-gray-700">{privilege}</span>
                              </div>
                              <span className="text-sm font-bold text-indigo-600">{count}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t border-indigo-100">
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}