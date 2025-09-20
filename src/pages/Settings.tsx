import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export default function Settings() {
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load municipalities from database
  const loadMunicipalities = async () => {
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setMunicipalities(data || []);
    } catch (error) {
      console.error('Error loading municipalities:', error);
      toast.error('فشل في تحميل البلديات');
    } finally {
      setLoading(false);
    }
  };

  // Sync municipalities from billboards table
  const syncMunicipalitiesFromBillboards = async () => {
    setSyncing(true);
    try {
      console.log('Starting sync process...');
      
      // Get unique municipalities from billboards
      const { data: billboardData, error: billboardError } = await supabase
        .from('billboards')
        .select('Municipality')
        .not('Municipality', 'is', null);

      console.log('Billboard data:', billboardData);
      
      if (billboardError) {
        console.error('Billboard error:', billboardError);
        throw billboardError;
      }

      const uniqueMunicipalities = [...new Set(
        (billboardData || [])
          .map((b: any) => b.Municipality)
          .filter(Boolean)
          .map((m: string) => m.trim())
      )];

      console.log('Unique municipalities from billboards:', uniqueMunicipalities);

      // Get existing municipalities
      const { data: existingMunicipalities, error: existingError } = await supabase
        .from('municipalities')
        .select('name');

      if (existingError) {
        console.error('Existing municipalities error:', existingError);
        throw existingError;
      }

      console.log('Existing municipalities:', existingMunicipalities);

      const existingNames = new Set((existingMunicipalities || []).map((m: any) => m.name));

      // Find new municipalities to add
      const newMunicipalities = uniqueMunicipalities.filter(name => !existingNames.has(name));

      console.log('New municipalities to add:', newMunicipalities);

      if (newMunicipalities.length === 0) {
        toast.success('جميع البلديات موجودة بالفعل');
        return;
      }

      // Add new municipalities
      const municipalitiesToInsert = newMunicipalities.map((name, index) => ({
        name: name,
        code: `AUTO-${String(municipalities.length + index + 1).padStart(3, '0')}`
      }));

      console.log('Municipalities to insert:', municipalitiesToInsert);

      const { data: insertedData, error: insertError } = await supabase
        .from('municipalities')
        .insert(municipalitiesToInsert)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Inserted municipalities:', insertedData);

      toast.success(`تم إضافة ${newMunicipalities.length} بلدية جديدة`);
      await loadMunicipalities(); // Reload the list

    } catch (error: any) {
      console.error('Error syncing municipalities:', error);
      toast.error(`فشل في مزامنة البلديات: ${error?.message || 'خطأ غير معروف'}`);
    } finally {
      setSyncing(false);
    }
  };

  // Add new municipality
  const addMunicipality = async (name: string, code: string) => {
    if (!name.trim() || !code.trim()) {
      toast.error('يرجى إدخال اسم البلدية والكود');
      return;
    }

    try {
      const { error } = await supabase
        .from('municipalities')
        .insert({ name: name.trim(), code: code.trim() });

      if (error) throw error;

      toast.success('تم إضافة البلدية بنجاح');
      await loadMunicipalities();
    } catch (error: any) {
      console.error('Error adding municipality:', error);
      toast.error(`فشل في إضافة البلدية: ${error?.message || 'خطأ غير معروف'}`);
    }
  };

  // Delete municipality
  const deleteMunicipality = async (id: number) => {
    if (!window.confirm('هل تريد حذف هذه البلدية؟')) return;

    try {
      const { error } = await supabase
        .from('municipalities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف البلدية');
      await loadMunicipalities();
    } catch (error: any) {
      console.error('Error deleting municipality:', error);
      toast.error(`فشل في حذف البلدية: ${error?.message || 'خطأ غير معروف'}`);
    }
  };

  // Update municipality
  const updateMunicipality = async (id: number, name: string, code: string) => {
    try {
      const { error } = await supabase
        .from('municipalities')
        .update({ name: name.trim(), code: code.trim() })
        .eq('id', id);

      if (error) throw error;

      toast.success('تم تحديث البلدية');
      await loadMunicipalities();
    } catch (error: any) {
      console.error('Error updating municipality:', error);
      toast.error(`فشل في تحديث البلدية: ${error?.message || 'خطأ غير معروف'}`);
    }
  };

  useEffect(() => {
    loadMunicipalities();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إعدادات النظام</h1>
          <p className="text-muted-foreground">إدارة البلديات وإعدادات النظام</p>
        </div>
        <Button 
          onClick={syncMunicipalitiesFromBillboards}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className={`h-4 w-4 ml-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'جاري المزامنة...' : 'مزامنة البلديات من اللوحات'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إدارة البلديات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add new municipality form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <Input 
                placeholder="اسم البلدية" 
                id="new-municipality-name"
              />
              <Input 
                placeholder="كود البلدية" 
                id="new-municipality-code"
              />
              <Button 
                onClick={() => {
                  const nameInput = document.getElementById('new-municipality-name') as HTMLInputElement;
                  const codeInput = document.getElementById('new-municipality-code') as HTMLInputElement;
                  if (nameInput && codeInput) {
                    addMunicipality(nameInput.value, codeInput.value);
                    nameInput.value = '';
                    codeInput.value = '';
                  }
                }}
              >
                إضافة بلدية
              </Button>
            </div>

            {/* Municipalities table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الرقم</TableHead>
                  <TableHead>اسم البلدية</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {municipalities.map((municipality) => (
                  <TableRow key={municipality.id}>
                    <TableCell>{municipality.id}</TableCell>
                    <TableCell>
                      <Input 
                        defaultValue={municipality.name}
                        id={`name-${municipality.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        defaultValue={municipality.code}
                        id={`code-${municipality.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => {
                            const nameInput = document.getElementById(`name-${municipality.id}`) as HTMLInputElement;
                            const codeInput = document.getElementById(`code-${municipality.id}`) as HTMLInputElement;
                            if (nameInput && codeInput) {
                              updateMunicipality(municipality.id, nameInput.value, codeInput.value);
                            }
                          }}
                        >
                          تحديث
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteMunicipality(municipality.id)}
                        >
                          حذف
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {municipalities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد بلديات. استخدم زر المزامنة لإضافة البلديات من اللوحات الموجودة.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}