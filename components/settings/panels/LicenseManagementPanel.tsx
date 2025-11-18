import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState, useMemo, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Search, Filter, Plus, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { recordingsApi, type Court, type SubscriptionData } from "@/services/api"
import { toast } from "sonner"
import { auditLogger } from "@/services/auditService"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ActiveSubscription {
  id: string
  subscriptionName: string
  courtName: string
  activationDate: string
  renewalDate: string
  plan: "Basic" | "Premium" | "Enterprise"
  features: string[]
  maxUsers: number
  status: "active"
}

const activeSubscriptions: ActiveSubscription[] = [
  {
    id: "sub-001",
    subscriptionName: "Court Recording Pro",
    courtName: "Constitutional Court",
    activationDate: "2024-01-01",
    renewalDate: "2024-12-31",
    plan: "Enterprise",
    features: ["Audio Recording", "Transcription", "Cloud Storage", "Advanced Analytics"],
    maxUsers: 100,
    status: "active"
  },
  {
    id: "sub-002",
    subscriptionName: "Recording Standard",
    courtName: "Supreme Court",
    activationDate: "2024-02-15",
    renewalDate: "2025-02-15",
    plan: "Premium",
    features: ["Audio Recording", "Transcription", "Cloud Storage"],
    maxUsers: 50,
    status: "active"
  },
  {
    id: "sub-003",
    subscriptionName: "Basic Recording Suite",
    courtName: "High Court Harare",
    activationDate: "2024-03-01",
    renewalDate: "2025-03-01",
    plan: "Basic",
    features: ["Audio Recording", "Local Storage"],
    maxUsers: 25,
    status: "active"
  },
  {
    id: "sub-004",
    subscriptionName: "Court Recording Pro",
    courtName: "Magistrates Court Harare",
    activationDate: "2024-01-15",
    renewalDate: "2024-12-15",
    plan: "Premium",
    features: ["Audio Recording", "Transcription", "Cloud Storage"],
    maxUsers: 40,
    status: "active"
  },
  {
    id: "sub-005",
    subscriptionName: "Enterprise Recording",
    courtName: "Labour Court",
    activationDate: "2024-02-01",
    renewalDate: "2025-02-01",
    plan: "Enterprise",
    features: ["Multi-Channel Recording", "AI Transcription", "Advanced Analytics", "Cloud Storage"],
    maxUsers: 75,
    status: "active"
  }
]

export function LicenseManagementPanel() {
  const { isSuperAdmin, user } = useAuth()
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<ActiveSubscription | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [planFilter, setPlanFilter] = useState<ActiveSubscription['plan'] | 'all'>('all')
  const [filters, setFilters] = useState({
    subscriptionName: '',
    courtName: '',
    plan: '',
    maxUsers: '',
  })

  // License generation state
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [courts, setCourts] = useState<Court[]>([])
  const [newSubscription, setNewSubscription] = useState<SubscriptionData>({
    court_id: '',
    allowed_courtrooms: '',
    start_date: new Date().toISOString().split('T')[0], // Today's date
    expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // One year from today
  })

  // Fetch courts for the license generation form
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const fetchedCourts = await recordingsApi.getCourts()
        setCourts(fetchedCourts)
      } catch (error) {
        console.error("Error fetching courts:", error)
      }
    }

    if (isSuperAdmin) {
      fetchCourts()
    }
  }, [isSuperAdmin])

  // Filter the subscriptions based on search query and plan
  const filteredSubscriptions = useMemo(() => {
    return activeSubscriptions.filter(subscription => {
      const matchesSearch = 
        subscription.subscriptionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subscription.courtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subscription.plan.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesPlan = planFilter === 'all' || subscription.plan === planFilter

      const matchesFilters = 
        (!filters.subscriptionName || subscription.subscriptionName.toLowerCase().includes(filters.subscriptionName.toLowerCase())) &&
        (!filters.courtName || subscription.courtName.toLowerCase().includes(filters.courtName.toLowerCase())) &&
        (!filters.plan || subscription.plan.toLowerCase().includes(filters.plan.toLowerCase())) &&
        (!filters.maxUsers || subscription.maxUsers.toString().includes(filters.maxUsers))

      return matchesSearch && matchesPlan && matchesFilters
    })
  }, [searchQuery, planFilter, filters])

  const handleViewDetails = (subscription: ActiveSubscription) => {
    setSelectedSubscription(subscription)
    setIsSubscriptionDialogOpen(true)
  }

  const handleGenerateSubscription = async () => {
    try {
      setIsGenerating(true)
      console.log('🔍 Starting license generation with data:', newSubscription)
      
      await recordingsApi.generateSubscription(newSubscription)
      
      console.log('✅ License generated successfully!')
      
      // Log the license generation event
      const selectedCourt = courts.find(court => court.court_id.toString() === newSubscription.court_id)
      const courtName = selectedCourt?.court_name || `Court ID: ${newSubscription.court_id}`
      const details = `Court: ${courtName}, Courtrooms: ${newSubscription.allowed_courtrooms}, Start: ${newSubscription.start_date}, End: ${newSubscription.expiration_date}`
      
      auditLogger.generateLicense(
        user?.email || 'unknown@court.gov.zw',
        courtName,
        details
      )
      
      toast.success("License generated successfully!", {
        description: `New license created for court ID: ${newSubscription.court_id}`
      })
      
      // Reset form and close dialog
      setNewSubscription({
        court_id: '',
        allowed_courtrooms: '',
        start_date: new Date().toISOString().split('T')[0], // Today's date
        expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // One year from today
      })
      setIsGenerateDialogOpen(false)
      
    } catch (error) {
      console.error("❌ Error generating subscription:", error)
      console.log('📝 Check the console above for API debugging information')
      
      let errorMessage = "Please try again";
      if (error instanceof Error) {
        if (error.message.includes('400')) {
          errorMessage = "Invalid data format. Please check all fields are correctly filled.";
        } else if (error.message.includes('404')) {
          errorMessage = "The license generation endpoint was not found on the server.";
        } else if (error.message.includes('500')) {
          errorMessage = "Server error. Please contact support.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error("Failed to generate license", {
        description: errorMessage
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const getPlanBadge = (plan: ActiveSubscription['plan']) => {
    const variants = {
      'Basic': 'secondary',
      'Premium': 'default', 
      'Enterprise': 'destructive'
    }
    return <Badge variant={variants[plan] as any}>{plan}</Badge>
  }

  const TableHeadWithFilter = ({ 
    title, 
    filterKey 
  }: { 
    title: string
    filterKey: keyof typeof filters
  }) => (
    <TableHead className={title === 'Actions' ? 'text-right' : ''}>
      <div className="flex items-center gap-2">
        {title}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter {title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Input
                placeholder={`Filter ${title}...`}
                value={filters[filterKey]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  [filterKey]: e.target.value
                }))}
                className="h-8"
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Subscriptions</CardTitle>
            <div className="flex items-center gap-4">
              {/* Generate License Button - Only for Super Admins */}
              {isSuperAdmin && (
                <Button 
                  onClick={() => setIsGenerateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Generate New License
                </Button>
              )}

              {/* Plan Filter */}
              <Select
                value={planFilter}
                onValueChange={(value) => setPlanFilter(value as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subscriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadWithFilter title="Subscription" filterKey="subscriptionName" />
                <TableHeadWithFilter title="Court" filterKey="courtName" />
                <TableHeadWithFilter title="Plan" filterKey="plan" />
                <TableHeadWithFilter title="Max Users" filterKey="maxUsers" />
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {subscription.subscriptionName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {subscription.courtName}
                  </TableCell>
                  <TableCell>
                    {getPlanBadge(subscription.plan)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {subscription.maxUsers} users
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">Active</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(subscription)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubscriptions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No active subscriptions found matching the filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              View details for {selectedSubscription?.subscriptionName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subscription Name</Label>
                  <p className="text-sm">{selectedSubscription.subscriptionName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Court</Label>
                  <p className="text-sm">{selectedSubscription.courtName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Plan</Label>
                  <div>{getPlanBadge(selectedSubscription.plan)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Users</Label>
                  <p className="text-sm">{selectedSubscription.maxUsers} users</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Activation Date</Label>
                  <p className="text-sm">{new Date(selectedSubscription.activationDate).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Next Renewal</Label>
                  <p className="text-sm">{new Date(selectedSubscription.renewalDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Features</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedSubscription.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubscriptionDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate License Dialog - Only for Super Admins */}
      {isSuperAdmin && (
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate New License</DialogTitle>
              <DialogDescription>
                Create a new subscription license for a court. This will generate the license keys and activate the subscription. The license will be immediately active and accessible to the selected court.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="court_id">Court</Label>
                <Select
                  value={newSubscription.court_id}
                  onValueChange={(value) => setNewSubscription(prev => ({ ...prev, court_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a court" />
                  </SelectTrigger>
                  <SelectContent>
                    {courts.map((court) => (
                      <SelectItem key={court.court_id} value={court.court_id.toString()}>
                        {court.court_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowed_courtrooms">Allowed Courtrooms</Label>
                <Input
                  id="allowed_courtrooms"
                  placeholder="Enter number of allowed courtrooms"
                  type="number"
                  min="1"
                  value={newSubscription.allowed_courtrooms}
                  onChange={(e) => setNewSubscription(prev => ({ ...prev, allowed_courtrooms: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={newSubscription.start_date}
                  onChange={(e) => setNewSubscription(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration_date">Expiration Date</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  min={newSubscription.start_date}
                  value={newSubscription.expiration_date}
                  onChange={(e) => setNewSubscription(prev => ({ ...prev, expiration_date: e.target.value }))}
                />
                {new Date(newSubscription.expiration_date) <= new Date(newSubscription.start_date) && (
                  <p className="text-sm text-destructive">Expiration date must be after the start date</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsGenerateDialogOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateSubscription}
                disabled={
                  !newSubscription.court_id || 
                  !newSubscription.allowed_courtrooms || 
                  !newSubscription.start_date || 
                  !newSubscription.expiration_date || 
                  new Date(newSubscription.expiration_date) <= new Date(newSubscription.start_date) ||
                  isGenerating
                }
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate License"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 