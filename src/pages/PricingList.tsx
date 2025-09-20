import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as UIDialog from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Ruler, Building2, Settings, Edit2, Trash2, Plus } from 'lucide-react';

interface Level {
  id: number;
  name: string;
  created_at: string;
}

export default function Settings() {
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Level management states
  const [addLevelOpen, setAddLevelOpen] = useState(false);
  const [editLevelOpen, setEditLevelOpen] = useState(false);
  const [deleteLevelOpen, setDeleteLevelOpen] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [editLevelName, setEditLevelName] = useState('');
  const [deletingLevel, setDeletingLevel] = useState<Level | null>(null);

  // Helper function to close all dialogs
  const closeAllDialogs = () => {
    setAddLevelOpen(false);
    setEditLevelOpen(false);
    setDeleteLevelOpen(false);
    setNewLevelName('');
    setEditingLevel(null);
    setEditLevelName('');
    setDeletingLevel(null);
  };

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
    }
  };

  // Load sizes from database
  const loadSizes = async () => {
    try {
      const { data, error } = await supabase
        .from('sizes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSizes(data || []);
    } catch (error) {
      console.error('Error loading sizes:', error);
      toast.error('فشل في تحميل الأحجام');
    }
  };

  // Load levels from database
  const loadLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setLevels(data || []);
      console.log('✅ تم تحميل المستويات:', data);
    } catch (error) {
      console.error('Error loading levels:', error);
      toast.error('فشل في تحميل المستويات');
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

  // Sync sizes from billboards table
  const syncSizesFromBillboards = async () => {
    setSyncing(true);
    try {
      // Get unique sizes from billboards
      const { data: billboardData, error: billboardError } = await supabase
        .from('billboards')
        .select('Size')
        .not('Size', 'is', null);

      if (billboardError) throw billboardError;

      const uniqueSizes = [...new Set(
        (billboardData || [])
          .map((b: any) => b.Size)
          .filter(Boolean)
          .map((s: string) => s.trim())
      )];

      // Get existing sizes
      const { data: existingSizes, error: existingError } = await supabase
        .from('sizes')
        .select('name');

      if (existingError) throw existingError;

      const existingNames = new Set((existingSizes || []).map((s: any) => s.name));

      // Find new sizes to add
      const newSizes = uniqueSizes.filter(name => !existingNames.has(name));

      if (newSizes.length === 0) {
        toast.success('جميع الأحجام موجودة بالفعل');
        return;
      }

      // Add new sizes with default level 'A'
      const sizesToInsert = newSizes.map((name) => ({
        name: name,
        level: 'A'
      }));

      const { error: insertError } = await supabase
        .from('sizes')
        .insert(sizesToInsert);

      if (insertError) throw insertError;

      toast.success(`تم إضافة ${newSizes.length} حجم جديد`);
      await loadSizes(); // Reload the list

    } catch (error: any) {
      console.error('Error syncing sizes:', error);
      toast.error(`فشل في مزامنة الأحجام: ${error?.message || 'خطأ غير معروف'}`);
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

  // Add new size
  const addSize = async (name: string, level: string) => {
    if (!name.trim() || !level.trim()) {
      toast.error('يرجى إدخال اسم الحجم والمستوى');
      return;
    }

    try {
      const { error } = await supabase
        .from('sizes')
        .insert({ name: name.trim(), level: level.trim() });

      if (error) throw error;

      toast.success('تم إضافة الحجم بنجاح');
      await loadSizes();
    } catch (error: any) {
      console.error('Error adding size:', error);
      toast.error(`فشل في إضافة الحجم: ${error?.message || 'خطأ غير معروف'}`);
    }
  };

  // Add new level
  const addLevel = async () => {
    const levelName = newLevelName.trim().toUpperCase();
    if (!levelName) {
      toast.error('يرجى إدخال اسم المستوى');
      return;
    }

    // Check if level already exists
    const existingLevel = levels.find(l => l.name === levelName);
    if (existingLevel) {
      toast.error('هذا المستوى موجود بالفعل');
      return;
    }

    try {
      const { error } = await supabase
        .from('levels')
        .insert({ name: levelName });

      if (error) throw error;

      toast.success('تم إضافة المستوى بنجاح');
      closeAllDialogs();
      await loadLevels();
    } catch (error: any) {
      console.error('Error adding level:', error);
      toast.error(`فشل في إضافة المستوى: ${error?.message || 'خطأ غير معروف'}`);
    }
  };

  // Update level
  const updateLevel = async () => {
    if (!editingLevel || !editLevelName.trim()) return;

    const levelName = editLevelName.trim().toUpperCase();
    
    // Check if new name already exists (excluding current level)
    const existingLevel = levels.find(l => l.name === levelName && l.id !== editingLevel.id);
    if (existingLevel) {
      toast.error('هذا المستوى موجود بالفعل');
      return;
    }

    try {
      const { error } = await supabase
        .from('levels')
        .update({ name: levelName })
        .eq('id', editingLevel.id);

      if (error) throw error;

      // Update related sizes
      const { error: sizesError } = await supabase
        .from('sizes')
        .update({ level: levelName })
        .eq('level', editingLevel.name);

      if (sizesError) {
        console.error('Error updating sizes:', sizesError);
      }

      // Update related pricing data
      const { error: pricingError } = await supabase
        .from('pricing')
        .update({ billboard_level: levelName })
        .eq('billboard_level', editingLevel.name);

      if (pricingError) {
        console.error('Error updating pricing:', pricingError);
      }

      toast.success('تم تحديث المستوى بنجاح');
      closeAllDialogs();
      await Promise.all([loadLevels(), loadSizes()]);
    } catch (error: any) {
      console.error('Error updating level:', error);
      toast.error(`فشل في تحديث المستوى: ${error?.message || 'خطأ غير معروف'}`);
    }
  };

  // Delete level
  const deleteLevel = async () => {
    if (!deletingLevel) return;

    try {
      // Delete related pricing data
      const { error: pricingError } = await supabase
        .from('pricing')
        .delete()
        .eq('billboard_level', deletingLevel.name);

      if (pricingError) {
        console.error('Error deleting pricing:', pricingError);
      }

      // Delete related sizes
      const { error: sizesError } = await supabase
        .from('sizes')
        .delete()
        .eq('level', deletingLevel.name);

      if (sizesError) {
        console.error('Error deleting sizes:', sizesError);
      }

      // Delete related categories
      const { error: categoriesError } = await supabase
        .from('pricing_categories')
        .delete()
        .eq('level', deletingLevel.name);

      if (categoriesError) {
        console.error('Error deleting categories:', categoriesError);
      }

      // Delete the level
      const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', deletingLevel.id);

      if (error) throw error;

      toast.success('تم حذف المستوى وجميع البيانات المرتبطة به');
      closeAllDialogs();
      await Promise.all([loadLevels(), loadSizes()]);
    } catch (error: any) {
      console.error('Error deleting level:', error);
      toast.error(`فشل في حذف المستوى: ${error?.message || 'خطأ غير معروف'}`);
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

  // Delete size
  const deleteSize = async (id: number) => {
    if (!window.confirm('هل تريد حذف هذا الحجم؟')) return;

    try {
      const { error } = await supabase
        .from('sizes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('تم حذف الحجم');
      await loadSizes();
    } catch (error: any) {
      console.error('Error deleting size:', error);
      toast.error(`فشل في حذف الحجم: ${error?.message || 'خطأ غير معروف'}`);
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

  // Update size
  const updateSize = async (id: number, name: string, level: string) => {
    try {
      const { error } = await supabase
        .from('sizes')
        .update({ name: name.trim(), level: level.trim() })
        .eq('id', id);

      if (error) throw error;

      toast.success('تم تحديث الحجم');
      await loadSizes();
    } catch (error: any) {
      console.error('Error updating size:', error);
      toast.error(`فشل في تحديث الحجم: ${error?.message || 'خطأ غير معروف'}`);
    }
  };

  // Open add level dialog
  const openAddLevelDialog = () => {
    closeAllDialogs();
    setAddLevelOpen(true);
  };

  // Open edit level dialog
  const openEditLevelDialog = (level: Level) => {
    closeAllDialogs();
    setEditingLevel(level);
    setEditLevelName(level.name);
    setEditLevelOpen(true);
  };

  // Open delete level dialog
  const openDeleteLevelDialog = (level: Level) => {
    closeAllDialogs();
    setDeletingLevel(level);
    setDeleteLevelOpen(true);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadMunicipalities(), loadSizes(), loadLevels()]);
    };
    loadData();
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
          <p className="text-muted-foreground">إدارة البلديات والأحجام والمستويات وإعدادات النظام</p>
        </div>
      </div>

      <Tabs defaultValue="municipalities" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="municipalities" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            البلديات
          </TabsTrigger>
          <TabsTrigger value="sizes" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            الأحجام
          </TabsTrigger>
          <TabsTrigger value="levels" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            المستويات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="municipalities" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>إدارة البلديات</CardTitle>
              <Button 
                onClick={syncMunicipalitiesFromBillboards}
                disabled={syncing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'جاري المزامنة...' : 'مزامنة من اللوحات'}
              </Button>
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
        </TabsContent>

        <TabsContent value="sizes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>إدارة الأحجام</CardTitle>
              <Button 
                onClick={syncSizesFromBillboards}
                disabled={syncing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'جاري المزامنة...' : 'مزامنة من اللوحات'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add new size form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <Input 
                    placeholder="اسم الحجم (مثل: 12x4)" 
                    id="new-size-name"
                  />
                  <Select>
                    <SelectTrigger id="new-size-level">
                      <SelectValue placeholder="اختر المستوى" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map(level => (
                        <SelectItem key={level.id} value={level.name}>
                          مستوى {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => {
                      const nameInput = document.getElementById('new-size-name') as HTMLInputElement;
                      const levelSelect = document.querySelector('#new-size-level [data-state="checked"]') as HTMLElement;
                      const levelValue = levelSelect?.getAttribute('data-value') || 'A';
                      if (nameInput && nameInput.value.trim()) {
                        addSize(nameInput.value, levelValue);
                        nameInput.value = '';
                      }
                    }}
                  >
                    إضافة حجم
                  </Button>
                </div>

                {/* Sizes table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم</TableHead>
                      <TableHead>اسم الحجم</TableHead>
                      <TableHead>المستوى</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sizes.map((size) => (
                      <TableRow key={size.id}>
                        <TableCell>{size.id}</TableCell>
                        <TableCell>
                          <Input 
                            defaultValue={size.name}
                            id={`size-name-${size.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select defaultValue={size.level}>
                            <SelectTrigger id={`size-level-${size.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {levels.map(level => (
                                <SelectItem key={level.id} value={level.name}>
                                  مستوى {level.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {new Date(size.created_at).toLocaleDateString('ar-SA')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => {
                                const nameInput = document.getElementById(`size-name-${size.id}`) as HTMLInputElement;
                                const levelSelect = document.querySelector(`#size-level-${size.id} [data-state="checked"]`) as HTMLElement;
                                const levelValue = levelSelect?.getAttribute('data-value') || size.level;
                                if (nameInput) {
                                  updateSize(size.id, nameInput.value, levelValue);
                                }
                              }}
                            >
                              تحديث
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteSize(size.id)}
                            >
                              حذف
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {sizes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد أحجام. استخدم زر المزامنة لإضافة الأحجام من اللوحات الموجودة.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>إدارة المستويات</CardTitle>
              <Button 
                onClick={openAddLevelDialog}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة مستوى جديد
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Levels table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الرقم</TableHead>
                      <TableHead>اسم المستوى</TableHead>
                      <TableHead>عدد الأحجام</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levels.map((level) => {
                      const levelSizesCount = sizes.filter(s => s.level === level.name).length;
                      return (
                        <TableRow key={level.id}>
                          <TableCell>{level.id}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-lg">مستوى {level.name}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{levelSizesCount} حجم</span>
                          </TableCell>
                          <TableCell>
                            {new Date(level.created_at).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openEditLevelDialog(level)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => openDeleteLevelDialog(level)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {levels.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد مستويات. انقر على "إضافة مستوى جديد" لإنشاء مستوى.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Level Dialog */}
      <UIDialog.Dialog open={addLevelOpen} onOpenChange={(open) => !open && closeAllDialogs()}>
        <UIDialog.DialogContent>
          <UIDialog.DialogHeader>
            <UIDialog.DialogTitle>إضافة مستوى جديد</UIDialog.DialogTitle>
            <UIDialog.DialogDescription>
              أدخل اسم المستوى الجديد (حرف واحد مثل A, B, C, S)
            </UIDialog.DialogDescription>
          </UIDialog.DialogHeader>
          <Input 
            placeholder="اسم المستوى (مثال: D)" 
            value={newLevelName} 
            onChange={e => setNewLevelName(e.target.value)}
            maxLength={1}
            autoFocus
          />
          <UIDialog.DialogFooter>
            <Button variant="outline" onClick={closeAllDialogs}>إلغاء</Button>
            <Button onClick={addLevel} disabled={!newLevelName.trim()}>إضافة المستوى</Button>
          </UIDialog.DialogFooter>
        </UIDialog.DialogContent>
      </UIDialog.Dialog>

      {/* Edit Level Dialog */}
      <UIDialog.Dialog open={editLevelOpen} onOpenChange={(open) => !open && closeAllDialogs()}>
        <UIDialog.DialogContent>
          <UIDialog.DialogHeader>
            <UIDialog.DialogTitle>تعديل المستوى</UIDialog.DialogTitle>
            <UIDialog.DialogDescription>
              قم بتعديل اسم المستوى. سيتم تحديث جميع البيانات المرتبطة تلقائياً.
            </UIDialog.DialogDescription>
          </UIDialog.DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">الاسم الحالي: مستوى {editingLevel?.name}</label>
            </div>
            <Input 
              placeholder="الاسم الجديد" 
              value={editLevelName} 
              onChange={e => setEditLevelName(e.target.value)}
              maxLength={1}
              autoFocus
            />
          </div>
          <UIDialog.DialogFooter>
            <Button variant="outline" onClick={closeAllDialogs}>إلغاء</Button>
            <Button onClick={updateLevel} disabled={!editLevelName.trim()}>تحديث المستوى</Button>
          </UIDialog.DialogFooter>
        </UIDialog.DialogContent>
      </UIDialog.Dialog>

      {/* Delete Level Dialog */}
      <UIDialog.Dialog open={deleteLevelOpen} onOpenChange={(open) => !open && closeAllDialogs()}>
        <UIDialog.DialogContent>
          <UIDialog.DialogHeader>
            <UIDialog.DialogTitle>تأكيد حذف المستوى</UIDialog.DialogTitle>
            <UIDialog.DialogDescription>
              هذا الإجراء لا يمكن التراجع عنه
            </UIDialog.DialogDescription>
          </UIDialog.DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              هل أنت متأكد من حذف المستوى <strong>"{deletingLevel?.name}"</strong>؟ 
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ تحذير: سيتم حذف جميع الأحجام والأسعار والفئات المرتبطة بهذا المستوى نهائياً ولا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
          </div>
          <UIDialog.DialogFooter>
            <Button variant="outline" onClick={closeAllDialogs}>إلغاء</Button>
            <Button variant="destructive" onClick={deleteLevel}>حذف نهائياً</Button>
          </UIDialog.DialogFooter>
        </UIDialog.DialogContent>
      </UIDialog.Dialog>
    </div>
  );
}