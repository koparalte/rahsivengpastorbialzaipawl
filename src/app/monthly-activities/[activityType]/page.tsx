
import type { Metadata } from 'next';
import { format, startOfMonth, parseISO } from 'date-fns';
import MonthlyActivityDisplay from './client-page'; // Import the client component

const typeMapping: { [key: string]: { firestoreType: string; displayName: string; } } = {
  rawngbawlna: { firestoreType: 'event1', displayName: 'Rawngbawlna' },
  'hla-zir': { firestoreType: 'event2', displayName: 'Hla Zir' },
  others: { firestoreType: 'event3', displayName: 'Other Activities' },
};

const defaultTypeInfo = {
  firestoreType: '', // For 'others' or unmapped types, we might not filter by a specific firestoreType
  displayName: 'Activities',
};

// generateMetadata runs on the server and does NOT have access to searchParams.
// So, we make the title more generic here. The client component will update document.title.
export async function generateMetadata({ params }: { params: { activityType: string } }): Promise<Metadata> {
  const activityTypeParam = params.activityType;
  const typeDetail = typeMapping[activityTypeParam] || {
    ...defaultTypeInfo, 
    displayName: activityTypeParam.charAt(0).toUpperCase() + activityTypeParam.slice(1).replace('-', ' ')
  };
  const activityName = typeDetail.displayName;

  // Generic title, as specific month is not known at server build/render time for this route structure
  return {
    title: `${activityName} by Month | Rahsiveng Pastor Bial Zaipawl`,
    description: `View ${activityName.toLowerCase()} details for a selected month.`,
  };
}

export default function MonthlyActivityTypePageServer({ params }: { params: { activityType: string } }) {
  const activityTypeParam = params.activityType;
  const typeDetail = typeMapping[activityTypeParam] ||
                     {
                       ...defaultTypeInfo,
                       displayName: activityTypeParam.charAt(0).toUpperCase() + activityTypeParam.slice(1).replace('-', ' ')
                     };

  return (
    <MonthlyActivityDisplay
      activityTypeParam={activityTypeParam}
      typeDetail={typeDetail}
    />
  );
}
