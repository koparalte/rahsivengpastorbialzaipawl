
import type { Metadata } from 'next';
import { format, startOfMonth } from 'date-fns';
// Remove icon imports from server component
import MonthlyActivityDisplay from './client-page'; // Import the client component

// Shared typeMapping, accessible by generateMetadata and the Page component
// Remove icon from this server-side mapping
const typeMapping: { [key: string]: { firestoreType: string; displayName: string; } } = {
  rawngbawlna: { firestoreType: 'event1', displayName: 'Rawngbawlna' },
  'hla-zir': { firestoreType: 'event2', displayName: 'Hla Zir' },
  others: { firestoreType: 'event3', displayName: 'Other Activities' },
};

// Default info for unknown activity types
// Remove icon from this server-side mapping
const defaultTypeInfo = {
  firestoreType: '',
  displayName: 'Activities',
};

export async function generateMetadata({ params }: { params: { activityType: string } }): Promise<Metadata> {
  const activityTypeParam = params.activityType;
  // Use a default displayName if activityTypeParam is not in typeMapping
  const typeDetail = typeMapping[activityTypeParam] || {
    ...defaultTypeInfo, 
    displayName: activityTypeParam.charAt(0).toUpperCase() + activityTypeParam.slice(1)
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
  // Provide a fallback for displayName if activityTypeParam is not in typeMapping
  // The icon will be handled by the client component
  const typeDetail = typeMapping[activityTypeParam] ||
                     {
                       ...defaultTypeInfo,
                       displayName: activityTypeParam.charAt(0).toUpperCase() + activityTypeParam.slice(1)
                     };

  return (
    <MonthlyActivityDisplay
      activityTypeParam={activityTypeParam}
      typeDetail={typeDetail} // Pass serializable data only
    />
  );
}
