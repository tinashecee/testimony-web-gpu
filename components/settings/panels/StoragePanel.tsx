import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function StoragePanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used Space</span>
                <span>75%</span>
              </div>
              <Progress value={75} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Space</p>
                <p className="text-lg font-medium">1 TB</p>
              </div>
              <div>
                <p className="text-muted-foreground">Available</p>
                <p className="text-lg font-medium">250 GB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 