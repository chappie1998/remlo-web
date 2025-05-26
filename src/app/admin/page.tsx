"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MetricsChart } from '@/components/admin/MetricsChart';
import { 
  Users, 
  CreditCard, 
  ArrowUpDown, 
  DollarSign, 
  TrendingUp, 
  Activity,
  RefreshCw,
  Calendar,
  Link,
  Send,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react';

interface AdminMetrics {
  users: {
    total: number;
    withWallets: number;
    withPasscode: number;
    usingMPC: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  transactions: {
    total: number;
    pending: number;
    executed: number;
    failed: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
  };
  paymentLinks: {
    total: number;
    active: number;
    claimed: number;
    expired: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
  };
  paymentRequests: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
  };
  volume: {
    totalUSDC: number;
    totalUSDS: number;
    todayUSDC: number;
    todayUSDS: number;
    weekUSDC: number;
    weekUSDS: number;
    monthUSDC: number;
    monthUSDS: number;
    swapVolume: number;
    usdsCirculation: number;
    transactions: {
      totalUSDC: number;
      totalUSDS: number;
      todayUSDC: number;
      todayUSDS: number;
      weekUSDC: number;
      weekUSDS: number;
      monthUSDC: number;
      monthUSDS: number;
    };
    paymentLinks: {
      totalUSDC: number;
      totalUSDS: number;
      todayUSDC: number;
      todayUSDS: number;
      weekUSDC: number;
      weekUSDS: number;
      monthUSDC: number;
      monthUSDS: number;
    };
    paymentRequests: {
      totalUSDC: number;
      totalUSDS: number;
      todayUSDC: number;
      todayUSDS: number;
      weekUSDC: number;
      weekUSDS: number;
      monthUSDC: number;
      monthUSDS: number;
    };
  };
  recentActivity: Array<{
    id: string;
    type: 'user_signup' | 'transaction' | 'payment_link' | 'payment_request';
    description: string;
    timestamp: string;
    amount?: string;
    tokenType?: string;
  }>;
}

// Simple Card Component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-2xl font-semibold leading-none tracking-tight text-white ${className}`}>{children}</h3>;
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400">{children}</p>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

// Simple Button Component
function Button({ 
  children, 
  onClick, 
  variant = "default",
  size = "default",
  className = "",
  disabled = false 
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  disabled?: boolean;
}) {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClasses = {
    default: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline: "border border-gray-600 bg-transparent hover:bg-gray-800 text-white",
    ghost: "hover:bg-gray-800 text-white"
  };
  
  const sizeClasses = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3",
    lg: "h-11 px-8"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// Simple Badge Component
function Badge({ 
  children, 
  variant = "default" 
}: { 
  children: React.ReactNode; 
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  const variantClasses = {
    default: "bg-emerald-600 text-white",
    secondary: "bg-gray-600 text-white",
    destructive: "bg-red-600 text-white",
    outline: "border border-gray-600 text-gray-300"
  };

  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]}`}>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Check authentication
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // In development, allow any authenticated user
    // In production, you should check for admin role
    const isDev = process.env.NODE_ENV === 'development';
    const adminEmails = ['admin@remlo.com', 'hello.notmove@gmail.com'];
    
    if (!isDev && !adminEmails.includes(session.user?.email || '')) {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/metrics');
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchMetrics();
    }
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
          <span className="text-white">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">Error: {error}</div>
          <Button onClick={fetchMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">No data available</div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return <Users className="h-4 w-4" />;
      case 'transaction': return <ArrowUpDown className="h-4 w-4" />;
      case 'payment_link': return <Link className="h-4 w-4" />;
      case 'payment_request': return <Send className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_signup': return 'text-blue-400';
      case 'transaction': return 'text-emerald-400';
      case 'payment_link': return 'text-purple-400';
      case 'payment_request': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Monitor and analyze platform metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={fetchMetrics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Badge variant="secondary">
              Last updated: {new Date().toLocaleTimeString()}
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-800">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'transactions', label: 'Transactions', icon: ArrowUpDown },
                { id: 'volume', label: 'Volume', icon: DollarSign },
                { id: 'payments', label: 'Payments', icon: CreditCard },
                { id: 'activity', label: 'Activity', icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(metrics.users.total)}</div>
                  <p className="text-xs text-gray-400">
                    +{metrics.users.newToday} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <ArrowUpDown className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(metrics.transactions.total)}</div>
                  <p className="text-xs text-gray-400">
                    +{metrics.transactions.todayCount} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payment Links</CardTitle>
                  <Link className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(metrics.paymentLinks.total)}</div>
                  <p className="text-xs text-gray-400">
                    +{metrics.paymentLinks.todayCount} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(metrics.volume.totalUSDC + metrics.volume.totalUSDS)}
                  </div>
                  <p className="text-xs text-gray-400">
                    USDC + USDS combined
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Volume Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">USDC Volume</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {formatCurrency(metrics.volume.totalUSDC)}
                  </div>
                  <p className="text-xs text-gray-400">
                    +{formatCurrency(metrics.volume.todayUSDC)} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">USDS Volume</CardTitle>
                  <DollarSign className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">
                    {formatCurrency(metrics.volume.totalUSDS)}
                  </div>
                  <p className="text-xs text-gray-400">
                    +{formatCurrency(metrics.volume.todayUSDS)} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">USDS Circulation</CardTitle>
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">
                    {formatCurrency(metrics.volume.usdsCirculation)}
                  </div>
                  <p className="text-xs text-gray-400">
                    Total USDS minted/converted
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Swap Volume</CardTitle>
                  <ArrowUpDown className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(metrics.volume.swapVolume)}
                  </div>
                  <p className="text-xs text-gray-400">
                    Total swap transactions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Distribution</CardTitle>
                  <CardDescription>Breakdown of user types</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart
                    type="pie"
                    data={[
                      { label: 'With Wallets', value: metrics.users.withWallets, color: '#10B981' },
                      { label: 'With Passcode', value: metrics.users.withPasscode, color: '#3B82F6' },
                      { label: 'Using MPC', value: metrics.users.usingMPC, color: '#8B5CF6' },
                      { label: 'Basic Users', value: metrics.users.total - metrics.users.withWallets, color: '#6B7280' },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transaction Status</CardTitle>
                  <CardDescription>Current transaction states</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart
                    type="bar"
                    data={[
                      { label: 'Executed', value: metrics.transactions.executed, color: '#10B981' },
                      { label: 'Pending', value: metrics.transactions.pending, color: '#F59E0B' },
                      { label: 'Failed', value: metrics.transactions.failed, color: '#EF4444' },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Volume by Source</CardTitle>
                  <CardDescription>Volume breakdown by platform feature</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart
                    type="pie"
                    data={[
                      { 
                        label: 'Transactions', 
                        value: metrics.volume.transactions.totalUSDC + metrics.volume.transactions.totalUSDS, 
                        color: '#10B981' 
                      },
                      { 
                        label: 'Payment Links', 
                        value: metrics.volume.paymentLinks.totalUSDC + metrics.volume.paymentLinks.totalUSDS, 
                        color: '#8B5CF6' 
                      },
                      { 
                        label: 'Payment Requests', 
                        value: metrics.volume.paymentRequests.totalUSDC + metrics.volume.paymentRequests.totalUSDS, 
                        color: '#F59E0B' 
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>New user registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Today</span>
                      <span className="font-medium">{formatNumber(metrics.users.newToday)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">This Week</span>
                      <span className="font-medium">{formatNumber(metrics.users.newThisWeek)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">This Month</span>
                      <span className="font-medium">{formatNumber(metrics.users.newThisMonth)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Features</CardTitle>
                  <CardDescription>Feature adoption rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">With Wallets</span>
                      <span className="font-medium">{formatNumber(metrics.users.withWallets)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">With Passcode</span>
                      <span className="font-medium">{formatNumber(metrics.users.withPasscode)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Using MPC</span>
                      <span className="font-medium">{formatNumber(metrics.users.usingMPC)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Users</CardTitle>
                  <CardDescription>Platform overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-400 mb-2">
                      {formatNumber(metrics.users.total)}
                    </div>
                    <p className="text-gray-400">Registered users</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(metrics.transactions.total)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Executed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">{formatNumber(metrics.transactions.executed)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">{formatNumber(metrics.transactions.pending)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">{formatNumber(metrics.transactions.failed)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Volume Breakdown</CardTitle>
                  <CardDescription>Transaction volume by token type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-medium mb-4 text-blue-400">USDC Volume</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.totalUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Today</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.todayUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">This Week</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.weekUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">This Month</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.monthUSDC)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-4 text-purple-400">USDS Volume</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.totalUSDS)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Today</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.todayUSDS)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">This Week</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.weekUSDS)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">This Month</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.monthUSDS)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Volume by Source</CardTitle>
                  <CardDescription>Breakdown by platform feature</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-3 text-emerald-400">Direct Transactions</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">USDC</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.transactions.totalUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">USDS</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.transactions.totalUSDS)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 text-purple-400">Payment Links</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">USDC</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.paymentLinks.totalUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">USDS</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.paymentLinks.totalUSDS)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 text-orange-400">Payment Requests</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">USDC</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.paymentRequests.totalUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">USDS</span>
                          <span className="font-medium">{formatCurrency(metrics.volume.paymentRequests.totalUSDS)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-orange-400">USDS Circulation</span>
                        <span className="font-bold text-orange-400">{formatCurrency(metrics.volume.usdsCirculation)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Total USDS minted/converted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'volume' && (
          <div className="space-y-6">
            {/* Volume Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(metrics.volume.totalUSDC + metrics.volume.totalUSDS)}
                  </div>
                  <p className="text-xs text-gray-400">All tokens combined</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">USDC Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {formatCurrency(metrics.volume.totalUSDC)}
                  </div>
                  <p className="text-xs text-gray-400">+{formatCurrency(metrics.volume.todayUSDC)} today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">USDS Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">
                    {formatCurrency(metrics.volume.totalUSDS)}
                  </div>
                  <p className="text-xs text-gray-400">+{formatCurrency(metrics.volume.todayUSDS)} today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">USDS Circulation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">
                    {formatCurrency(metrics.volume.usdsCirculation)}
                  </div>
                  <p className="text-xs text-gray-400">Total minted/converted</p>
                </CardContent>
              </Card>
            </div>

            {/* Volume Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Volume by Token Type</CardTitle>
                  <CardDescription>USDC vs USDS distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart
                    type="pie"
                    data={[
                      { label: 'USDC', value: metrics.volume.totalUSDC, color: '#3B82F6' },
                      { label: 'USDS', value: metrics.volume.totalUSDS, color: '#8B5CF6' },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Volume by Source</CardTitle>
                  <CardDescription>Platform feature breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart
                    type="pie"
                    data={[
                      { 
                        label: 'Transactions', 
                        value: metrics.volume.transactions.totalUSDC + metrics.volume.transactions.totalUSDS, 
                        color: '#10B981' 
                      },
                      { 
                        label: 'Payment Links', 
                        value: metrics.volume.paymentLinks.totalUSDC + metrics.volume.paymentLinks.totalUSDS, 
                        color: '#8B5CF6' 
                      },
                      { 
                        label: 'Payment Requests', 
                        value: metrics.volume.paymentRequests.totalUSDC + metrics.volume.paymentRequests.totalUSDS, 
                        color: '#F59E0B' 
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Detailed Volume Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Direct Transactions</CardTitle>
                  <CardDescription>Wallet-to-wallet transfers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">USDC</span>
                        <span className="font-medium text-blue-400">{formatCurrency(metrics.volume.transactions.totalUSDC)}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Today:</span>
                          <span>{formatCurrency(metrics.volume.transactions.todayUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Week:</span>
                          <span>{formatCurrency(metrics.volume.transactions.weekUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Month:</span>
                          <span>{formatCurrency(metrics.volume.transactions.monthUSDC)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">USDS</span>
                        <span className="font-medium text-purple-400">{formatCurrency(metrics.volume.transactions.totalUSDS)}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Today:</span>
                          <span>{formatCurrency(metrics.volume.transactions.todayUSDS)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Week:</span>
                          <span>{formatCurrency(metrics.volume.transactions.weekUSDS)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Month:</span>
                          <span>{formatCurrency(metrics.volume.transactions.monthUSDS)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Links</CardTitle>
                  <CardDescription>Link-based payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">USDC</span>
                        <span className="font-medium text-blue-400">{formatCurrency(metrics.volume.paymentLinks.totalUSDC)}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Today:</span>
                          <span>{formatCurrency(metrics.volume.paymentLinks.todayUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Week:</span>
                          <span>{formatCurrency(metrics.volume.paymentLinks.weekUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Month:</span>
                          <span>{formatCurrency(metrics.volume.paymentLinks.monthUSDC)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">USDS</span>
                        <span className="font-medium text-purple-400">{formatCurrency(metrics.volume.paymentLinks.totalUSDS)}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Today:</span>
                          <span>{formatCurrency(metrics.volume.paymentLinks.todayUSDS)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Week:</span>
                          <span>{formatCurrency(metrics.volume.paymentLinks.weekUSDS)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Month:</span>
                          <span>{formatCurrency(metrics.volume.paymentLinks.monthUSDS)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Requests</CardTitle>
                  <CardDescription>Request-based payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">USDC</span>
                        <span className="font-medium text-blue-400">{formatCurrency(metrics.volume.paymentRequests.totalUSDC)}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Today:</span>
                          <span>{formatCurrency(metrics.volume.paymentRequests.todayUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Week:</span>
                          <span>{formatCurrency(metrics.volume.paymentRequests.weekUSDC)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Month:</span>
                          <span>{formatCurrency(metrics.volume.paymentRequests.monthUSDC)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">USDS</span>
                        <span className="font-medium text-purple-400">{formatCurrency(metrics.volume.paymentRequests.totalUSDS)}</span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Today:</span>
                          <span>{formatCurrency(metrics.volume.paymentRequests.todayUSDS)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Week:</span>
                          <span>{formatCurrency(metrics.volume.paymentRequests.weekUSDS)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Month:</span>
                          <span>{formatCurrency(metrics.volume.paymentRequests.monthUSDS)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Special Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>USDS Ecosystem</CardTitle>
                  <CardDescription>USDS-specific metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-orange-950/20 rounded-lg">
                      <div>
                        <div className="font-medium text-orange-400">Total Circulation</div>
                        <div className="text-xs text-gray-400">USDS minted/converted</div>
                      </div>
                      <div className="text-xl font-bold text-orange-400">
                        {formatCurrency(metrics.volume.usdsCirculation)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-950/20 rounded-lg">
                      <div>
                        <div className="font-medium text-purple-400">Total Volume</div>
                        <div className="text-xs text-gray-400">All USDS transactions</div>
                      </div>
                      <div className="text-xl font-bold text-purple-400">
                        {formatCurrency(metrics.volume.totalUSDS)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-emerald-950/20 rounded-lg">
                      <div>
                        <div className="font-medium text-emerald-400">Swap Volume</div>
                        <div className="text-xs text-gray-400">Token conversions</div>
                      </div>
                      <div className="text-xl font-bold text-emerald-400">
                        {formatCurrency(metrics.volume.swapVolume)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Volume Trends</CardTitle>
                  <CardDescription>Time-based volume comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart
                    type="bar"
                    data={[
                      { 
                        label: 'Today', 
                        value: metrics.volume.todayUSDC + metrics.volume.todayUSDS, 
                        color: '#10B981' 
                      },
                      { 
                        label: 'This Week', 
                        value: metrics.volume.weekUSDC + metrics.volume.weekUSDS, 
                        color: '#3B82F6' 
                      },
                      { 
                        label: 'This Month', 
                        value: metrics.volume.monthUSDC + metrics.volume.monthUSDS, 
                        color: '#8B5CF6' 
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Links</CardTitle>
                  <CardDescription>Link status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart
                    type="pie"
                    data={[
                      { label: 'Active', value: metrics.paymentLinks.active, color: '#10B981' },
                      { label: 'Claimed', value: metrics.paymentLinks.claimed, color: '#3B82F6' },
                      { label: 'Expired', value: metrics.paymentLinks.expired, color: '#6B7280' },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Requests</CardTitle>
                  <CardDescription>Request status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart
                    type="pie"
                    data={[
                      { label: 'Pending', value: metrics.paymentRequests.pending, color: '#F59E0B' },
                      { label: 'Completed', value: metrics.paymentRequests.completed, color: '#10B981' },
                      { label: 'Cancelled', value: metrics.paymentRequests.cancelled, color: '#EF4444' },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-800/50">
                      <div className={`p-2 rounded-full bg-gray-800 ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{activity.description}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(activity.timestamp).toLocaleString()}</span>
                          {activity.amount && (
                            <>
                              <span>•</span>
                              <span>{formatCurrency(parseFloat(activity.amount))} {activity.tokenType?.toUpperCase()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 