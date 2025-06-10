
"use client";

import { PictureFrame } from '@/components/members/picture-frame';
import { MemberStats } from '@/components/members/member-stats';
import { db, firebaseInitializationError } from '@/lib/firebase';
import { collection, onSnapshot, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { getCachedData, setCachedData } from '@/lib/cache';

const MEMBERS_CACHE_KEY = 'firebaseMembersCache';

export interface PictureData {
  id: string;
  imageUrl: string;
  altText: string;
  aiHint?: string;
  name?: string;
  designation?: string;
  designation2?: string;
  phoneNumber?: string;
  profileUrl?: string;
  kohhran?: string;
  gender?: 'm' | 'f' | string;
}

type GroupedMembers = Record<string, PictureData[]>;

const UNCATEGORIZED_KEY = "Other Members";
const CONDUCTOR_KEY = "Conductor";

const isConductorRole = (role?: string): boolean => {
  if (!role) return false;
  const lowerRole = role.toLowerCase();
  return lowerRole === 'conductor' || lowerRole === 'asst conductor' || lowerRole === 'asst. conductor' || lowerRole === 'assistant conductor';
};

export function MemberGallery() {
  const [groupedMembers, setGroupedMembers] = useState<GroupedMembers>({});
  const [allMembers, setAllMembers] = useState<PictureData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string>(""); 
  const [sortedDesignationKeys, setSortedDesignationKeys] = useState<string[]>([]);

  useEffect(() => {
    const cachedMembers = getCachedData<PictureData[]>(MEMBERS_CACHE_KEY);
    if (cachedMembers) {
      processAndSetMembers(cachedMembers);
      setIsLoading(false); // Loaded from cache
      console.log("[MemberGallery] Loaded members from cache.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to check cache

  const processAndSetMembers = (pictureList: PictureData[]) => {
      setAllMembers(pictureList);
      const groups: GroupedMembers = pictureList.reduce((acc, member) => {
        let groupKey: string;
        const primaryDes = member.designation;

        if (isConductorRole(primaryDes)) {
          groupKey = CONDUCTOR_KEY;
        } else if (primaryDes && primaryDes.trim() !== "" && primaryDes !== "N/A" && primaryDes !== UNCATEGORIZED_KEY) {
          groupKey = primaryDes;
        } else {
          groupKey = UNCATEGORIZED_KEY;
        }

        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(member);
        return acc;
      }, {} as GroupedMembers);

      for (const key in groups) {
        groups[key].sort((a, b) => {
          const aHasValidDesignation2 = a.designation2 && a.designation2.trim() !== "" && a.designation2 !== "N/A";
          const bHasValidDesignation2 = b.designation2 && b.designation2.trim() !== "" && b.designation2 !== "N/A";

          if (aHasValidDesignation2 && !bHasValidDesignation2) return -1;
          if (!aHasValidDesignation2 && bHasValidDesignation2) return 1;
          
          if (key === CONDUCTOR_KEY) {
            const roleA = a.designation?.toLowerCase() || "";
            const roleB = b.designation?.toLowerCase() || "";
            const aIsMainConductor = roleA === 'conductor';
            const bIsMainConductor = roleB === 'conductor';
            if (aIsMainConductor && !bIsMainConductor) return -1;
            if (!aIsMainConductor && bIsMainConductor) return 1;
          }
          return (a.name || "").localeCompare(b.name || "");
        });
      }
      setGroupedMembers(groups);

      const allKeys = Object.keys(groups);
      const conductorExists = allKeys.includes(CONDUCTOR_KEY);
      const otherMembersExists = allKeys.includes(UNCATEGORIZED_KEY);

      let sortedKeys = allKeys.filter(key => key !== CONDUCTOR_KEY && key !== UNCATEGORIZED_KEY);
      sortedKeys.sort((a, b) => a.localeCompare(b));

      const finalSortedKeys: string[] = [];
      if (conductorExists) finalSortedKeys.push(CONDUCTOR_KEY);
      finalSortedKeys.push(...sortedKeys);
      if (otherMembersExists && (!conductorExists || UNCATEGORIZED_KEY !== CONDUCTOR_KEY)) {
        finalSortedKeys.push(UNCATEGORIZED_KEY);
      }
      
      setSortedDesignationKeys(finalSortedKeys);
  };

  useEffect(() => {
    if (firebaseInitializationError) {
      setError(`Firebase Initialization Error: ${firebaseInitializationError}`);
      setIsLoading(false);
      // setGroupedMembers({}); // Don't clear if loaded from cache
      // setAllMembers([]);
      return;
    }

    if (!db) {
      setError("Firestore database is not available. Firebase might not have initialized correctly. Please check your .env.local configuration and restart the server.");
      setIsLoading(false);
      // setGroupedMembers({});
      // setAllMembers([]);
      return;
    }

    // setError(null); // Clear error only on successful connection
    // setIsLoading(true); // Only set if not already loaded from cache

    const picturesCollectionRef = collection(db, "pictures");

    const unsubscribe = onSnapshot(picturesCollectionRef, (snapshot) => {
      const pictureList: PictureData[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const imageUrl = data.imageUrl;
        const altText = data.altText;
        const aiHint = data.aiHint;
        const name = data.name;
        const designation = data.designation;
        const designation2 = data.designation2;
        const phoneNumber = data.phoneNumber;
        const profileUrl = data.profileUrl;
        const kohhran = data.kohhran;
        const gender = data.gender;

        if (!imageUrl) console.warn(`[Firestore Data Check] Document ID ${doc.id} missing 'imageUrl'.`);
        if (!altText) console.warn(`[Firestore Data Check] Document ID ${doc.id} missing 'altText'.`);
        if (name === undefined) console.warn(`[Firestore Data Check] Document ID ${doc.id} missing 'name'.`);
        if (designation2 !== undefined && typeof designation2 !== 'string') {
            console.warn(`[Firestore Data Check] Document ID ${doc.id} has 'designation2' field that is not a string. It will be ignored.`);
        }
        if (phoneNumber !== undefined && typeof phoneNumber !== 'string') {
            console.warn(`[Firestore Data Check] Document ID ${doc.id} has 'phoneNumber' field that is not a string. It will be ignored.`);
        }
        if (profileUrl !== undefined && typeof profileUrl === 'string') { // Should be profileUrl
            console.warn(`[Firestore Data Check] Document ID ${doc.id} has 'profileUrl' field that is not a string. It will be ignored.`);
        } else if (profileUrl !== undefined && typeof profileUrl !== 'string') { // Keep original warning if it's not a string
             console.warn(`[Firestore Data Check] Document ID ${doc.id} has 'profileUrl' field that is not a string. It will be ignored.`);
        }
        if (kohhran !== undefined && typeof kohhran !== 'string') {
            console.warn(`[Firestore Data Check] Document ID ${doc.id} has 'kohhran' field that is not a string. It will be ignored.`);
        }
        let validatedGender: 'm' | 'f' | undefined = undefined;
        if (gender !== undefined) {
          if (gender === 'm' || gender === 'f') {
            validatedGender = gender;
          } else {
            console.warn(`[Firestore Data Check] Document ID ${doc.id} has invalid 'gender' field: '${gender}'. Expected 'm' or 'f'. It will be treated as unspecified.`);
          }
        }

        return {
          id: doc.id,
          imageUrl: imageUrl || "https://placehold.co/300x300.png",
          altText: altText || "Image from Firestore",
          aiHint: aiHint || "abstract",
          name: name || "N/A",
          designation: designation,
          designation2: typeof designation2 === 'string' ? designation2 : undefined,
          phoneNumber: phoneNumber || "N/A",
          profileUrl: typeof profileUrl === 'string' ? profileUrl : undefined,
          kohhran: typeof kohhran === 'string' ? kohhran : undefined,
          gender: validatedGender,
        };
      });
      
      processAndSetMembers(pictureList);
      setCachedData(MEMBERS_CACHE_KEY, pictureList); // Update cache
      setIsLoading(false);
      setError(null); // Clear error on successful fetch
    }, (err) => {
      console.error("Error fetching pictures from Firestore:", err);
      if (!getCachedData(MEMBERS_CACHE_KEY)) { // Only set error if no cache
        setError(`Failed to load pictures from Firestore: ${err.message}. Check browser console for details (e.g., permission errors, incorrect project config) and ensure your Firestore rules allow reads to the 'pictures' collection.`);
        setGroupedMembers({});
        setAllMembers([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []); 

  useEffect(() => {
    if (isLoading) {
      return; 
    }

    if (sortedDesignationKeys.length > 0) {
      if (activeAccordionItem !== "" && !sortedDesignationKeys.includes(activeAccordionItem)) {
        setActiveAccordionItem(""); 
      }
    } else {
      if (activeAccordionItem !== "") {
        setActiveAccordionItem("");
      }
    }
  }, [sortedDesignationKeys, isLoading, activeAccordionItem]);


  if (error && !getCachedData(MEMBERS_CACHE_KEY)) { // Show error only if no cache
    return (
      <div className="text-center my-10 p-4 bg-destructive/10 text-destructive border border-destructive rounded-md">
        <h3 className="text-xl font-semibold mb-2">Error Loading Members</h3>
        <p>{error}</p>
        {(error.toLowerCase().includes("firebase") || error.toLowerCase().includes("firestore")) && (
             <p className="mt-2 text-sm">
                Please ensure your Firebase configuration in <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> is correct and the server has been restarted.
                Also, verify your Firestore 'pictures' collection exists, has the correct document structure (including 'gender' and 'kohhran' fields where applicable), and security rules allow reads.
                Check the browser console for more specific Firebase errors.
                <strong>Importantly, also check your terminal (where <code className="bg-muted px-1 py-0.5 rounded">npm run dev</code> is running) for any server-side error messages.</strong>
             </p>
        )}
      </div>
    );
  }

  if (isLoading && Object.keys(groupedMembers).length === 0) { // Show loading only if no data (from cache or initial fetch)
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading members from Firestore...</p>
      </div>
    );
  }
  
  return (
    <section className="w-full py-6 space-y-4">
      <MemberStats members={allMembers} />

      {Object.keys(groupedMembers).length === 0 && !isLoading && (
        <div className="text-center my-10 p-4 bg-secondary/50 text-secondary-foreground border border-border rounded-md">
          <h3 className="text-xl font-semibold mb-2">No Members Yet!</h3>
          <p>If you've configured Firebase, add documents to your 'pictures' collection in Firestore to see them here.</p>
          <p className="mt-1 text-sm">Each document should have at least <code className="bg-muted px-1 py-0.5 rounded">imageUrl</code>, <code className="bg-muted px-1 py-0.5 rounded">altText</code>, <code className="bg-muted px-1 py-0.5 rounded">name</code> fields. For full statistics, also include <code className="bg-muted px-1 py-0.5 rounded">kohhran</code> (string) and <code className="bg-muted px-1 py-0.5 rounded">gender</code> ('m' or 'f') fields. Optionally include <code className="bg-muted px-1 py-0.5 rounded">designation</code>, <code className="bg-muted px-1 py-0.5 rounded">designation2</code>, <code className="bg-muted px-1 py-0.5 rounded">phoneNumber</code>, and <code className="bg-muted px-1 py-0.5 rounded">profileUrl</code>. Check browser console for warnings if fields are missing or have incorrect types.</p>
        </div>
      )}

      {Object.keys(groupedMembers).length > 0 && (
        <Accordion
          type="single"
          collapsible
          value={activeAccordionItem}
          onValueChange={setActiveAccordionItem}
          className="w-full"
        >
          {sortedDesignationKeys.map((designationKey) => {
            let displayAccordionLabel = designationKey;
            const lowerKey = designationKey.toLowerCase();
            if (lowerKey === "soprano") displayAccordionLabel = "Sopranos";
            else if (lowerKey === "alto") displayAccordionLabel = "Altos";
            else if (lowerKey === "tenor") displayAccordionLabel = "Tenors";
            else if (lowerKey === "bass") displayAccordionLabel = "Basses";
            
            return (
              <AccordionItem value={designationKey} key={designationKey}>
                <AccordionTrigger className="hover:no-underline px-4 py-3 bg-muted/50 rounded-t-md text-lg font-semibold">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>{displayAccordionLabel}</span>
                    <Badge variant="secondary" className="ml-2">{groupedMembers[designationKey]?.length || 0}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-background rounded-b-md border border-t-0">
                  {groupedMembers[designationKey] && groupedMembers[designationKey].length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {groupedMembers[designationKey].map((pic) => (
                        <PictureFrame
                          key={pic.id}
                          imageUrl={pic.imageUrl}
                          altText={pic.altText}
                          aiHint={pic.aiHint || "firestore image"}
                          name={pic.name}
                          designation={pic.designation}
                          designation2={pic.designation2}
                          phoneNumber={pic.phoneNumber}
                          profileUrl={pic.profileUrl}
                          kohhran={pic.kohhran}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No members in this category.</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </section>
  );
}
