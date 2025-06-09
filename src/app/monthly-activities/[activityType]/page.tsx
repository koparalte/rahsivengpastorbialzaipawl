
import type { Metadata } from 'next';
import { format, startOfMonth } from 'date-fns';
import { CalendarCheck, CalendarClock, Package as PackageIcon } from 'lucide-react';
import MonthlyActivityDisplay from './client-page'; // Import the client component

// Shared typeMapping, accessible by generateMetadata and the Page component
const typeMapping: { [key: string]: { firestoreType: string; displayName: string; icon: React.ElementType } } = {
  rawngbawlna: { firestoreType: 'event1', displayName: 'Rawngbawlna', icon: CalendarCheck },
  'hla-zir': { firestoreType: 'event2', displayName: 'Hla Zir', icon: CalendarClock },
  others: { firestoreType: 'event3', displayName: 'Other Activities', icon: PackageIcon },
};

// Default info for unknown activity types
const defaultTypeInfo = { 
  firestoreType: '', // Or some other default/indicator
  displayName: 'Activities', 
  icon: PackageIcon 
};

export async function generateMetadata({ params }: { params: { activityType: string } }): Promise<Metadata> {
  const activityTypeParam = params.activityType;
  // Use a default displayName if activityTypeParam is not in typeMapping
  const typeDetail = typeMapping[activityTypeParam] || { 
    ...defaultTypeInfo, // Spread defaultTypeInfo first
    displayName: activityTypeParam.charAt(0).toUpperCase() + activityTypeParam.slice(1) // Then override displayName
  };
  const activityName = typeDetail.displayName;
  const currentMonthName = format(startOfMonth(new Date()), 'MMMM yyyy');

  return {
    title: `${activityName} - ${currentMonthName} | Rahsiveng Pastor Bial Zaipawl`,
    description: `View ${activityName.toLowerCase()} for ${currentMonthName}.`,
  };
}

export default function MonthlyActivityTypePageServer({ params }: { params: { activityType: string } }) {
  const activityTypeParam = params.activityType;
  // Provide a fallback for displayName and icon if activityTypeParam is not in typeMapping
  const typeDetail = typeMapping[activityTypeParam] || 
                     { 
                       ...defaultTypeInfo, 
                       displayName: activityTypeParam.charAt(0).toUpperCase() + activityTypeParam.slice(1) 
                     };

  return (
    <MonthlyActivityDisplay 
      activityTypeParam={activityTypeParam} 
      typeDetail={typeDetail}
    />
  );
}
