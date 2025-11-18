import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export function BackupPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Backup Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Backup Frequency</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Backup Location</Label>
            <Input placeholder="/path/to/backup" />
          </div>

          <div className="space-y-2">
            <Label>Retention Period (days)</Label>
            <Input type="number" placeholder="30" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline">Restore Backup</Button>
        <Button>Start Backup Now</Button>
      </div>
    </div>
  )
} 