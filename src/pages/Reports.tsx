import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Reports() {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle>التقارير والإحصائيات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">عرض تقارير الأداء والإحصائيات.</div>
        </CardContent>
      </Card>
    </div>
  );
}
