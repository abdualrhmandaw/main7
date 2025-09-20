import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  Users, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalBillboards: number;
  availableBillboards: number;
  activeContracts: number;
  totalRevenue: number;
  activeCustomers: number;
  expiringContracts: number;
}

interface ContractRow {
  Contract_Number: string | null;
  'Customer Name': string | null;
  'Ad Type': string | null;
  'Total Rent': string | number | null;
  'Start Date'?: string | null;
  'End Date'?: string | null;
  customer_id?: string | null;
  created_at?: string | null;
}

interface PaymentRow {
  id: string;
  customer_id: string | null;
  customer_name: string;
  contract_number: string | null;
  amount: number | null;
  method: string | null;
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  entry_type: 'invoice' | 'receipt' | 'debt' | 'account_payment' | string | null;
  created_at?: string | null;
}

interface BillboardRow {
  id: string;
  name: string;
  location: string;
  city: string;
  size: string;
  level: string;
  price: number;
  image: string;
  status: string;
  created_at?: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalBillboards: 0,
    availableBillboards: 0,
    activeContracts: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    expiringContracts: 0
  });

  const [recentContracts, setRecentContracts] = useState<ContractRow[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ContractRow[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRow[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<PaymentRow[]>([]);
  const [availableBillboards, setAvailableBillboards] = useState<BillboardRow[]>([]);
  const [overduePayments, setOverduePayments] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load billboards
      const { data: billboards } = await supabase.from('billboards').select('*');
      const totalBillboards = billboards?.length || 0;
      const availableBillboardsData = billboards?.filter(b => b.status === 'متاح') || [];
      
      // Load contracts
      const { data: contracts } = await supabase.from('Contract').select('*');
      const today = new Date();
      
      // Active contracts (current date is between start and end date)
      const activeContracts = contracts?.filter(contract => {
        const startDate = contract['Start Date'] ? new Date(contract['Start Date']) : null;
        const endDate = contract['End Date'] ? new Date(contract['End Date']) : null;
        return startDate && endDate && today >= startDate && today <= endDate;
      }) || [];

      // Contracts expiring in next 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const expiringContractsData = contracts?.filter(contract => {
        const endDate = contract['End Date'] ? new Date(contract['End Date']) : null;
        return endDate && endDate >= today && endDate <= thirtyDaysFromNow;
      }) || [];

      // Recent contracts (last 10)
      const recentContractsData = contracts?.sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      ).slice(0, 10) || [];

      // Overdue contracts (ended but still active)
      const overdueContractsData = contracts?.filter(contract => {
        const endDate = contract['End Date'] ? new Date(contract['End Date']) : null;
        return endDate && endDate < today;
      }) || [];

      // Load payments
      const { data: payments } = await supabase.from('customer_payments').select('*').order('created_at', { ascending: false });
      
      // Recent payments (last 10)
      const recentPaymentsData = payments?.filter(p => 
        p.entry_type === 'receipt' || p.entry_type === 'account_payment'
      ).slice(0, 10) || [];

      // Recent invoices (last 10)
      const recentInvoicesData = payments?.filter(p => 
        p.entry_type === 'invoice'
      ).slice(0, 10) || [];

      // Calculate total revenue
      const totalRevenue = payments?.reduce((sum, p) => {
        const amount = Number(p.amount) || 0;
        return p.entry_type === 'receipt' || p.entry_type === 'account_payment' ? sum + amount : sum;
      }, 0) || 0;

      // Get unique customers count
      const uniqueCustomers = new Set(contracts?.map(c => c.customer_id || c['Customer Name']).filter(Boolean));

      // Update states
      setStats({
        totalBillboards,
        availableBillboards: availableBillboardsData.length,
        activeContracts: activeContracts.length,
        totalRevenue,
        activeCustomers: uniqueCustomers.size,
        expiringContracts: expiringContractsData.length
      });

      setRecentContracts(recentContractsData);
      setExpiringContracts(expiringContractsData);
      setRecentPayments(recentPaymentsData);
      setRecentInvoices(recentInvoicesData);
      setAvailableBillboards(availableBillboardsData.slice(0, 10));
      setOverduePayments(overdueContractsData.slice(0, 10));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('فشل في تحميل بيانات الصفحة الرئيسية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('ar-LY')} د.ل`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ar-LY');
  };

  const getDaysUntilExpiry = (endDate: string | null) => {
    if (!endDate) return null;
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-300">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">لوحة التحكم</h1>
            <p className="text-slate-300 mt-1">ملخص شامل لجميع العمليات والأنشطة</p>
          </div>
          <div className="text-sm text-slate-400">
            آخر تحديث: {new Date().toLocaleString('ar-LY')}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">إجمالي اللوحات</p>
                  <p className="text-2xl font-bold text-slate-200">{stats.totalBillboards}</p>
                </div>
                <MapPin className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">اللوحات المتاحة</p>
                  <p className="text-2xl font-bold text-green-400">{stats.availableBillboards}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">العقود النشطة</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.activeContracts}</p>
                </div>
                <FileText className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">إجمالي الإيرادات</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">العملاء النشطين</p>
                  <p className="text-2xl font-bold text-slate-300">{stats.activeCustomers}</p>
                </div>
                <Users className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">عقود تنتهي قريباً</p>
                  <p className="text-2xl font-bold text-red-400">{stats.expiringContracts}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Contracts */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="bg-slate-750 border-b border-slate-600">
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                العقود التي تنتهي قريباً ({expiringContracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expiringContracts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-750 border-b border-slate-600">
                        <TableHead className="text-slate-300">رقم العقد</TableHead>
                        <TableHead className="text-slate-300">العميل</TableHead>
                        <TableHead className="text-slate-300">تاريخ الانتهاء</TableHead>
                        <TableHead className="text-slate-300">المتبقي</TableHead>
                        <TableHead className="text-slate-300">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringContracts.slice(0, 5).map((contract) => {
                        const daysLeft = getDaysUntilExpiry(contract['End Date']);
                        return (
                          <TableRow key={contract.Contract_Number} className="hover:bg-slate-750 border-b border-slate-700">
                            <TableCell className="font-medium text-slate-200">
                              {contract.Contract_Number}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {contract['Customer Name']}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatDate(contract['End Date'])}
                            </TableCell>
                            <TableCell>
                              <Badge variant={daysLeft && daysLeft <= 7 ? "destructive" : "secondary"}>
                                {daysLeft ? `${daysLeft} يوم` : '—'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => navigate(`/admin/customer-billing?name=${encodeURIComponent(contract['Customer Name'] || '')}`)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  لا توجد عقود تنتهي قريباً
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="bg-slate-750 border-b border-slate-600">
              <CardTitle className="flex items-center gap-2 text-yellow-400">
                <FileText className="h-5 w-5" />
                آخر الفواتير المُصدرة ({recentInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-750 border-b border-slate-600">
                        <TableHead className="text-slate-300">العميل</TableHead>
                        <TableHead className="text-slate-300">المبلغ</TableHead>
                        <TableHead className="text-slate-300">التاريخ</TableHead>
                        <TableHead className="text-slate-300">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentInvoices.slice(0, 5).map((invoice) => (
                        <TableRow key={invoice.id} className="hover:bg-slate-750 border-b border-slate-700">
                          <TableCell className="font-medium text-slate-200">
                            {invoice.customer_name}
                          </TableCell>
                          <TableCell className="text-yellow-400 font-semibold">
                            {formatCurrency(Number(invoice.amount) || 0)}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {formatDate(invoice.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/admin/customer-billing?name=${encodeURIComponent(invoice.customer_name || '')}`)}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  لا توجد فواتير حديثة
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Contracts */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="bg-slate-750 border-b border-slate-600">
              <CardTitle className="flex items-center gap-2 text-slate-300">
                <FileText className="h-5 w-5" />
                آخر العقود المضافة ({recentContracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentContracts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-750 border-b border-slate-600">
                        <TableHead className="text-slate-300">رقم العقد</TableHead>
                        <TableHead className="text-slate-300">العميل</TableHead>
                        <TableHead className="text-slate-300">القيمة</TableHead>
                        <TableHead className="text-slate-300">التاريخ</TableHead>
                        <TableHead className="text-slate-300">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentContracts.slice(0, 5).map((contract) => (
                        <TableRow key={contract.Contract_Number} className="hover:bg-slate-750 border-b border-slate-700">
                          <TableCell className="font-medium text-slate-200">
                            {contract.Contract_Number}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {contract['Customer Name']}
                          </TableCell>
                          <TableCell className="text-green-400 font-semibold">
                            {formatCurrency(Number(contract['Total Rent']) || 0)}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {formatDate(contract.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/admin/customer-billing?name=${encodeURIComponent(contract['Customer Name'] || '')}`)}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  لا توجد عقود حديثة
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="bg-slate-750 border-b border-slate-600">
              <CardTitle className="flex items-center gap-2 text-green-400">
                <DollarSign className="h-5 w-5" />
                آخر الإيصالات والدفعات ({recentPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-750 border-b border-slate-600">
                        <TableHead className="text-slate-300">العميل</TableHead>
                        <TableHead className="text-slate-300">المبلغ</TableHead>
                        <TableHead className="text-slate-300">النوع</TableHead>
                        <TableHead className="text-slate-300">التاريخ</TableHead>
                        <TableHead className="text-slate-300">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentPayments.slice(0, 5).map((payment) => (
                        <TableRow key={payment.id} className="hover:bg-slate-750 border-b border-slate-700">
                          <TableCell className="font-medium text-slate-200">
                            {payment.customer_name}
                          </TableCell>
                          <TableCell className="text-green-400 font-semibold">
                            {formatCurrency(Number(payment.amount) || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={payment.entry_type === 'receipt' ? 'default' : 'secondary'}>
                              {payment.entry_type === 'receipt' ? 'إيصال' : 'دفعة حساب'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {formatDate(payment.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/admin/customer-billing?name=${encodeURIComponent(payment.customer_name || '')}`)}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  لا توجد دفعات حديثة
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Billboards */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="bg-slate-750 border-b border-slate-600">
              <CardTitle className="flex items-center gap-2 text-green-400">
                <MapPin className="h-5 w-5" />
                اللوحات المتاحة ({availableBillboards.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {availableBillboards.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-750 border-b border-slate-600">
                        <TableHead className="text-slate-300">اسم اللوحة</TableHead>
                        <TableHead className="text-slate-300">الموقع</TableHead>
                        <TableHead className="text-slate-300">المقاس</TableHead>
                        <TableHead className="text-slate-300">السعر</TableHead>
                        <TableHead className="text-slate-300">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableBillboards.slice(0, 5).map((billboard) => (
                        <TableRow key={billboard.id} className="hover:bg-slate-750 border-b border-slate-700">
                          <TableCell className="font-medium text-slate-200">
                            {billboard.name}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {billboard.location}, {billboard.city}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {billboard.size} ({billboard.level})
                          </TableCell>
                          <TableCell className="text-yellow-400 font-semibold">
                            {formatCurrency(billboard.price)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate('/admin/billboards')}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  لا توجد لوحات متاحة
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overdue Contracts */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="bg-slate-750 border-b border-slate-600">
              <CardTitle className="flex items-center gap-2 text-red-400">
                <XCircle className="h-5 w-5" />
                العقود المتأخرة ({overduePayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {overduePayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-750 border-b border-slate-600">
                        <TableHead className="text-slate-300">رقم العقد</TableHead>
                        <TableHead className="text-slate-300">العميل</TableHead>
                        <TableHead className="text-slate-300">انتهى في</TableHead>
                        <TableHead className="text-slate-300">القيمة</TableHead>
                        <TableHead className="text-slate-300">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overduePayments.slice(0, 5).map((contract) => (
                        <TableRow key={contract.Contract_Number} className="hover:bg-slate-750 border-b border-slate-700">
                          <TableCell className="font-medium text-slate-200">
                            {contract.Contract_Number}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {contract['Customer Name']}
                          </TableCell>
                          <TableCell className="text-red-400">
                            {formatDate(contract['End Date'])}
                          </TableCell>
                          <TableCell className="text-slate-300 font-semibold">
                            {formatCurrency(Number(contract['Total Rent']) || 0)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/admin/customer-billing?name=${encodeURIComponent(contract['Customer Name'] || '')}`)}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  لا توجد عقود متأخرة
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="bg-slate-750 border-b border-slate-600">
            <CardTitle className="text-yellow-400">الإجراءات السريعة</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                onClick={() => navigate('/admin/contracts/new')}
                className="bg-slate-700 hover:bg-slate-600 text-yellow-400 border border-slate-600"
              >
                <FileText className="h-4 w-4 ml-2" />
                عقد جديد
              </Button>
              <Button 
                onClick={() => navigate('/admin/customers')}
                className="bg-slate-700 hover:bg-slate-600 text-green-400 border border-slate-600"
              >
                <Users className="h-4 w-4 ml-2" />
                إدارة العملاء
              </Button>
              <Button 
                onClick={() => navigate('/admin/billboards')}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600"
              >
                <MapPin className="h-4 w-4 ml-2" />
                إدارة اللوحات
              </Button>
              <Button 
                onClick={() => navigate('/admin/reports')}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-900 font-semibold"
              >
                <TrendingUp className="h-4 w-4 ml-2" />
                التقارير
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}