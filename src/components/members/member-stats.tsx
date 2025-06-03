
"use client";

import type { PictureData } from '@/components/members/member-gallery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart3, UserCheck, UserMinus } from 'lucide-react';

interface MemberStatsProps {
  members: PictureData[];
}

interface DetailedKohhranStat {
  name: string;
  totalCount: number;
  maleCount: number;
  femaleCount: number;
  unknownGenderCount: number;
}

export function MemberStats({ members }: MemberStatsProps) {
  if (!members || members.length === 0) {
    return (
      <Card className="shadow-md mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Member Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No member data available to generate statistics.</p>
        </CardContent>
      </Card>
    );
  }

  const totalMembers = members.length;

  const detailedKohhranCounts: Record<string, { total: number; male: number; female: number; unknown: number }> = {};

  members.forEach(member => {
    const kohhran = member.kohhran?.trim() || "Not Specified";
    if (!detailedKohhranCounts[kohhran]) {
      detailedKohhranCounts[kohhran] = { total: 0, male: 0, female: 0, unknown: 0 };
    }
    detailedKohhranCounts[kohhran].total++;
    if (member.gender === 'm') {
      detailedKohhranCounts[kohhran].male++;
    } else if (member.gender === 'f') {
      detailedKohhranCounts[kohhran].female++;
    } else {
      detailedKohhranCounts[kohhran].unknown++;
    }
  });

  const kohhranStats: DetailedKohhranStat[] = Object.entries(detailedKohhranCounts)
    .map(([name, counts]) => ({
      name,
      totalCount: counts.total,
      maleCount: counts.male,
      femaleCount: counts.female,
      unknownGenderCount: counts.unknown
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  return (
    <div className="mb-8 space-y-6">
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{totalMembers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kohhran hrang hrang a member te</CardTitle>
            <BarChart3 className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {kohhranStats.length > 0 ? (
              <ul className="space-y-3 text-sm max-h-72 overflow-y-auto pr-1">
                {kohhranStats.map(stat => (
                  <li key={stat.name} className="p-3 rounded-md border bg-card/50 shadow-sm">
                    <div className="flex justify-between items-center font-semibold mb-1.5">
                      <span className="text-card-foreground truncate pr-2" title={stat.name}>{stat.name}:</span>
                      <span className="text-card-foreground font-bold text-xs">{stat.totalCount}</span>
                    </div>
                    <div className="border-t border-border my-1.5"></div> {/* Added line */}
                    <div className="pl-2 space-y-1 text-xs border-l-2 border-muted ml-1 pl-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-muted-foreground">
                          <UserCheck className="h-3.5 w-3.5 mr-1.5 text-blue-500 flex-shrink-0" /> Mipa:
                        </div>
                        <span className="font-medium text-card-foreground">{stat.maleCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-muted-foreground">
                          <UserCheck className="h-3.5 w-3.5 mr-1.5 text-pink-500 flex-shrink-0" /> Hmeichhia:
                        </div>
                        <span className="font-medium text-card-foreground">{stat.femaleCount}</span>
                      </div>
                      {stat.unknownGenderCount > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-muted-foreground">
                            <UserMinus className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" /> Not Specified:
                          </div>
                          <span className="font-medium text-muted-foreground">{stat.unknownGenderCount}</span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No Kohhran data available to generate statistics.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
