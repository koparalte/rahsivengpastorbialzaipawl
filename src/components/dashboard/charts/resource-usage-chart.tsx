
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const chartData = [
  { resource: "Storage", usage: 75, limit: 100 },
  { resource: "DB Ops", usage: 120, limit: 200 },
  { resource: "Bandwidth", usage: 45, limit: 150 },
  { resource: "Functions", usage: 80, limit: 100 },
];

const chartConfig = {
  usage: {
    label: "Usage",
    color: "hsl(var(--chart-1))",
  },
  limit: {
    label: "Limit",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function ResourceUsageChart() {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Resource Usage</CardTitle>
        <CardDescription>Current usage vs. limits for key resources.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="resource" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <Tooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
              <Legend />
              <Bar dataKey="usage" fill="var(--color-usage)" radius={4} />
              <Bar dataKey="limit" fill="var(--color-limit)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
