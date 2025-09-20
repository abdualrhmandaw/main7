import { useState, useEffect } from 'react';
import { Contract } from '@/types';
import { fetchContracts } from '@/services/supabaseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, Eye, Edit, Trash2, Download, Calendar, User, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const ContractsTable = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const data = await fetchContracts();
      setContracts(data);
    } catch (error) {
      toast({
        title: "خطأ في تحميل العقود",
        description: "تعذر تحم��ل بيانات العقود",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const { user, isAdmin } = useAuth();
  const [contractNumberFilter, setContractNumberFilter] = useState('');

  const byPermissions = (list: Contract[]) => {
    if (isAdmin || !user) return list;
    const allowed = Array.isArray(user.allowedCustomers) ? user.allowedCustomers.map((s) => s.toLowerCase()) : [];
    const selfNames = [user.name, (user as any).company].filter(Boolean).map((s: string) => s.toLowerCase());
    return list.filter((c) => {
      const cust = String(c['Customer Name'] ?? '').toLowerCase();
      if (allowed.length > 0) return allowed.includes(cust);
      return selfNames.length > 0 ? selfNames.includes(cust) : false;
    });
  };

  const bySearch = (list: Contract[]) =>
    list.filter((contract) => {
      const searchOk =
        contract['Customer Name']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contract.Contract_Number ?? contract['Contract Number'] ?? '').toString().includes(searchTerm) ||
        contract['Ad Type']?.toLowerCase().includes(searchTerm.toLowerCase());
      const numberOk = !contractNumberFilter || (contract.Contract_Number ?? contract['Contract Number'] ?? '').toString().includes(contractNumberFilter);
      return searchOk && numberOk;
    });

  const filteredContracts = bySearch(byPermissions(contracts));

  // تقسيم إلى أقسام حسب عدد الأيام المتبقية
  const enriched = filteredContracts.map((c) => ({ contract: c, daysLeft: computeDaysLeft(c) }));
  const activeContracts = enriched.filter((x) => Number.isFinite(x.daysLeft) && x.daysLeft > 30);
  const nearExpiryContracts = enriched.filter((x) => Number.isFinite(x.daysLeft) && x.daysLeft > 0 && x.daysLeft <= 30);
  const expiredContracts = enriched.filter((x) => !Number.isFinite(x.daysLeft) ? false : x.daysLeft <= 0);

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined) return 'غير محدد';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof num !== 'number' || Number.isNaN(num)) return 'غير محدد';
    return `${num.toLocaleString('ar-LY')} د.ل`;
  };

  const formatDate = (date: string) => {
    if (!date) return 'غير محدد';
    try {
      return new Date(date).toLocaleDateString('ar-LY');
    } catch {
      return date;
    }
  };

  function computeDaysLeft(contract: Contract): number {
    try {
      const endDate = new Date(contract['End Date']);
      const today = new Date();
      const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
    } catch {
      return NaN;
    }
  }

  const getStatusBadge = (contract: Contract) => {
    const daysLeft = computeDaysLeft(contract);
    if (!Number.isFinite(daysLeft)) return <Badge variant="secondary">غير محدد</Badge>;
    if (daysLeft <= 0) {
      return <Badge variant="destructive">منتهي</Badge>;
    } else if (daysLeft <= 30) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">ينتهي قريباً</Badge>;
    } else {
      return <Badge variant="secondary">نشط</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="mr-2">جاري تحميل العقود...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* رأس القسم */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-lg">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">إدارة العقود</h2>
            <p className="text-muted-foreground">عرض وإدارة جميع العقود والاتفاقيات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            تصدير
          </Button>
          <Button className="gap-2" onClick={() => navigate('/admin/contracts/new')}>
            <FileText className="h-4 w-4" />
            عقد جديد
          </Button>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العقود</p>
                <p className="text-2xl font-bold">{contracts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">نشطة</p>
                <p className="text-2xl font-bold text-green-600">
                  {contracts.filter(c => {
                    const endDate = new Date(c['End Date']);
                    return endDate > new Date();
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عملاء مختلفين</p>
                <p className="text-2xl font-bold text-orange-600">
                  {new Set(contracts.map(c => c['Customer Name'])).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي القيمة</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(contracts.reduce((sum, c) => sum + (c['Total Rent'] || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* البحث والفلاتر */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في العقود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Input
              placeholder="فلترة برقم العقد"
              value={contractNumberFilter}
              onChange={(e) => setContractNumberFilter(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* العقود السارية */}
      <Card>
        <CardHeader>
          <CardTitle>عقود سارية ({activeContracts.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم العقد</TableHead>
                <TableHead className="text-right">اسم العميل</TableHead>
                <TableHead className="text-right">نوع الإعلان</TableHead>
                <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                <TableHead className="text-right">متبقي</TableHead>
                <TableHead className="text-right">القيمة الإجمالية</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeContracts.map(({contract, daysLeft}, index) => (
                <TableRow key={`${(contract.Contract_Number ?? contract['Contract Number'] ?? 'no-num')}-a-${index}`}>
                  <TableCell className="font-medium">{contract.Contract_Number ?? contract['Contract Number']}</TableCell>
                  <TableCell>{contract['Customer Name']}</TableCell>
                  <TableCell><Badge variant="outline">{contract['Ad Type']}</Badge></TableCell>
                  <TableCell>{formatDate(contract['End Date'] as any)}</TableCell>
                  <TableCell>{daysLeft} يوم</TableCell>
                  <TableCell>{formatCurrency(contract['Total Rent'] as any)}</TableCell>
                  <TableCell>{getStatusBadge(contract)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const cn = String(contract.Contract_Number ?? contract['Contract Number'] ?? '');
                          if (cn) navigate(`/admin/contracts/edit?contract=${encodeURIComponent(cn)}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const cn = String(contract.Contract_Number ?? contract['Contract Number'] ?? '');
                          if (cn) navigate(`/admin/contracts/edit?contract=${encodeURIComponent(cn)}`);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {activeContracts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">لا توجد عقود سارية مطابقة</div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};
