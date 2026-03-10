
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar as CalendarIcon,
  Plus,
  Wheat,
  Beef,
  Clock,
  AlertTriangle,
  CheckCircle,
  Filter,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { useTasks, useUpdateTask, useDeleteTask, Task } from "@/hooks/useTasks";
import { TaskForm } from "@/components/TaskForm";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { Trash2, Repeat, Bell, Download } from "lucide-react";
import { exportCalendarToPDF } from "@/lib/calendar-export";
import { useToast } from "@/hooks/use-toast";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { tasks: backendTasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { notifications, unreadCount, markRead, markAllRead } = useTaskNotifications();
  const { toast } = useToast();
  // Convert backend tasks to the format expected by the UI
  const tasks = backendTasks.map(task => ({
    id: parseInt(task.id.slice(-8), 16),
    title: task.title,
    date: new Date(task.task_date),
    type: task.task_type,
    priority: task.priority,
    completed: task.completed,
    description: task.description,
    originalId: task.id,
    recurrence: task.recurrence,
    assignedTo: task.assigned_to,
    parentTaskId: task.parent_task_id,
  })) as Array<{
    id: number;
    title: string;
    date: Date;
    type: 'crop' | 'livestock' | 'maintenance' | 'harvest';
    priority: 'low' | 'medium' | 'high';
    completed: boolean;
    description?: string;
    originalId: string;
    recurrence?: string | null;
    assignedTo?: string | null;
    parentTaskId?: string | null;
  }>;

  // Apply filters
  const filteredTasks = tasks.filter(task => {
    if (filterType !== "all" && task.type !== filterType) return false;
    if (filterPriority !== "all" && task.priority !== filterPriority) return false;
    if (filterStatus === "completed" && !task.completed) return false;
    if (filterStatus === "pending" && task.completed) return false;
    if (filterStatus === "overdue" && (task.completed || task.date >= new Date())) return false;
    return true;
  });

  const handleToggleComplete = async (taskId: string) => {
    const task = backendTasks.find(t => t.id === taskId);
    if (task) {
      await updateTask.mutateAsync({
        id: taskId,
        updates: { completed: !task.completed }
      });
    }
  };

  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(task => 
      task.date.toDateString() === date.toDateString()
    );
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'crop': return <Wheat className="h-4 w-4" />;
      case 'livestock': return <Beef className="h-4 w-4" />;
      case 'harvest': return <Wheat className="h-4 w-4" />;
      case 'maintenance': return <Clock className="h-4 w-4" />;
      default: return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'crop': return 'bg-farm-green/10 text-farm-green border-farm-green/20';
      case 'livestock': return 'bg-farm-barn/10 text-farm-barn border-farm-barn/20';
      case 'harvest': return 'bg-farm-harvest/10 text-farm-harvest border-farm-harvest/20';
      case 'maintenance': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const upcomingTasks = filteredTasks
    .filter(task => !task.completed && task.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const overdueTasks = filteredTasks.filter(task => 
    !task.completed && task.date < new Date()
  );

  const hasActiveFilters = filterType !== "all" || filterPriority !== "all" || filterStatus !== "all";
  const clearFilters = () => { setFilterType("all"); setFilterPriority("all"); setFilterStatus("all"); };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Farm Calendar</h1>
            <p className="text-muted-foreground mt-1">Schedule and track your farm activities</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <Bell className="h-3 w-3" />
                {unreadCount} new
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await exportCalendarToPDF(tasks.map(t => ({
                    title: t.title,
                    date: t.date,
                    type: t.type,
                    priority: t.priority,
                    completed: t.completed,
                    description: t.description,
                    recurrence: t.recurrence,
                    assignedTo: t.assignedTo,
                  })));
                  toast({ title: "PDF Downloaded", description: "Calendar report saved successfully." });
                } catch (e) {
                  toast({ variant: "destructive", title: "Export Failed", description: "Could not generate PDF." });
                }
              }}
              disabled={tasks.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <TaskForm />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="crop">Crop</SelectItem>
                    <SelectItem value="livestock">Livestock</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="harvest">Harvest</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
                    Clear Filters
                  </Button>
                )}
              </div>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-auto">
                  {filteredTasks.length} of {tasks.length} tasks
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Tasks Alert */}
        {overdueTasks.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">
                  {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendar View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border w-full"
                modifiers={{
                  hasTask: (date) => getTasksForDate(date).length > 0
                }}
                modifiersStyles={{
                  hasTask: { 
                    backgroundColor: 'hsl(84 31% 44% / 0.1)',
                    color: 'hsl(84 31% 44%)',
                    fontWeight: 'bold'
                  }
                }}
              />
              
              {/* Selected Date Tasks */}
              {selectedDate && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">
                    Tasks for {selectedDate.toLocaleDateString()}
                  </h3>
                  <div className="space-y-2">
                    {getTasksForDate(selectedDate).length === 0 ? (
                      <p className="text-muted-foreground text-sm">No tasks scheduled for this date</p>
                    ) : (
                      getTasksForDate(selectedDate).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            {getTaskIcon(task.type)}
                            <div>
                              <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.recurrence && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Repeat className="h-3 w-3" />
                                {task.recurrence}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleComplete(task.originalId)}
                              className="h-8 w-8 p-0"
                            >
                              <CheckCircle className={`h-4 w-4 ${task.completed ? 'text-green-600' : 'text-muted-foreground'}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask.mutateAsync(task.originalId)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Badge className={getTypeColor(task.type)}>
                              {task.type}
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-muted-foreground text-sm">Loading tasks...</p>
                ) : upcomingTasks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No upcoming tasks</p>
                ) : (
                  upcomingTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50">
                      <div className="flex-shrink-0 mt-1">
                        {getTaskIcon(task.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {task.date.toLocaleDateString()}
                        </p>
                        <div className="flex gap-1 mt-2">
                          <Badge className={`text-xs ${getTypeColor(task.type)}`}>
                            {task.type}
                          </Badge>
                          <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleComplete(task.originalId)}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <CheckCircle className={`h-4 w-4 ${task.completed ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">{tasks.length}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-farm-green" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{tasks.filter(t => t.completed).length}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{tasks.filter(t => !t.completed).length}</p>
                </div>
                <Clock className="h-8 w-8 text-farm-harvest" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
