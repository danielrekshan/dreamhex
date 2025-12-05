import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, StatusBar, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DreamScene } from './components/DreamScene';
import { BookReader } from './components/BookReader';
import { EntityDialog } from './components/EntityDialog';
import { MusicPlayer } from './components/MusicPlayer'; 
import { BOOK_CONTENT, BookPage } from './BookManifest';

const DREAM_DATABASE: any = require('./assets/world.json');
const SESSION_KEY = 'dreamhex_session_v3';

type DreamProgress = {
    [key: string]: {
        centralOpenCount: number;
        stationsVisited: Set<string>;
        interactedCount: number;
    }
};

export default function App() {
  const [currentDreamSlug, setCurrentDreamSlug] = useState('floating-in-thought');
  const [dreamData, setDreamData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [isExiting, setIsExiting] = useState(false); 
  const [nextDreamSlug, setNextDreamSlug] = useState<string | null>(null);
  
  const [isBookOpen, setBookOpen] = useState(false);
  const [bookPageIndex, setBookPageIndex] = useState(0); 
  const [unlockedPageIds, setUnlockedPageIds] = useState<string[]>(['intro_1', 'intro_2', 'intro_3', 'intro_4', 'gate_john_dee']);
  const [foundPageNotification, setFoundPageNotification] = useState<BookPage | null>(null);

  const [activeEntity, setActiveEntity] = useState<any>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionHistory, setInteractionHistory] = useState<string[]>([]); 

  const [dreamProgress, setDreamProgress] = useState<DreamProgress>({});

  const availablePages = useMemo(() => {
    return BOOK_CONTENT.filter(p => unlockedPageIds.includes(p.id));
  }, [unlockedPageIds]);
  
  const currentLeftPage = availablePages[bookPageIndex] || { content: " " };
  const currentRightPage = availablePages[bookPageIndex + 1] || { content: " " };
  const currentBookText = `${currentLeftPage.content} ${currentRightPage.content}`;

  useEffect(() => {
    const loadSession = async () => {
        setLoading(true);
        try {
            const savedState = await AsyncStorage.getItem(SESSION_KEY);
            if (savedState) {
                const parsed = JSON.parse(savedState);
                setDreamData(parsed.dreamData);
                setCurrentDreamSlug(parsed.slug || 'floating-in-thought');
                setUnlockedPageIds(parsed.unlockedPageIds || ['intro_1', 'intro_2', 'intro_3', 'intro_4', 'gate_john_dee']);
                
                const loadedProgress = parsed.dreamProgress ? Object.entries(parsed.dreamProgress).reduce((acc, [key, val]: any) => {
                    acc[key] = { ...val, stationsVisited: new Set(val.stationsVisited) };
                    return acc;
                }, {} as DreamProgress) : {};
                
                setDreamProgress(loadedProgress);
            } else {
                loadFromJSON(currentDreamSlug);
            }
        } catch (e) {
            console.warn("Failed to load session", e);
            loadFromJSON(currentDreamSlug);
        } finally {
            setLoading(false);
        }
    };
    loadSession();
  }, []);

  useEffect(() => {
      if (dreamData) {
          const session = {
              dreamData,
              dreamProgress: Object.entries(dreamProgress).reduce((acc, [key, val]) => {
                  acc[key] = { 
                      ...val, 
                      stationsVisited: Array.from(val.stationsVisited),
                  };
                  return acc;
              }, {} as any),
              slug: currentDreamSlug,
              unlockedPageIds,
              history: interactionHistory,
          };
          AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(e => console.warn("Save failed", e));
      }
  }, [dreamData, interactionHistory, currentDreamSlug, unlockedPageIds, dreamProgress]);

  const loadFromJSON = (slug: string) => {
      const dreams = DREAM_DATABASE.dreams || [];
      const found = dreams.find((d: any) => d.slug === slug);
      setDreamData(found ? JSON.parse(JSON.stringify(found)) : dreams[0]);
  };
  
  const checkPageUnlock = (currentSlug: string) => {
      const nextPage = BOOK_CONTENT.find(p => p.hiddenInDream === currentSlug);

      if (nextPage && 
          nextPage.pageUnlockCondition === 'FIRST_INTERACTION' &&
          !unlockedPageIds.includes(nextPage.id)
      ) {
          setUnlockedPageIds(prev => {
              if (!prev.includes(nextPage.id)) {
                  setFoundPageNotification(nextPage);
                  return [...prev, nextPage.id];
              }
              return prev;
          });
      }
  }

  const updateProgress = (type: 'CENTRAL_OPEN' | 'VISIT_STATION' | 'INTERACT', stationId?: string) => {
      setDreamProgress(prev => {
          const existingProgress = prev[currentDreamSlug];
          
          const current = {
              centralOpenCount: existingProgress?.centralOpenCount || 0,
              stationsVisited: existingProgress?.stationsVisited || new Set(),
              interactedCount: existingProgress?.interactedCount || 0,
          };
          
          if (type === 'CENTRAL_OPEN') {
              current.centralOpenCount += 1;
          }
          if (type === 'VISIT_STATION' && stationId) {
              current.stationsVisited.add(stationId); 
          }
          if (type === 'INTERACT') {
              current.interactedCount += 1;
          }

          return { 
              ...prev, 
              [currentDreamSlug]: { 
                  ...current,
                  stationsVisited: new Set(current.stationsVisited),
              } 
          };
      });
  };

  // NEW HANDLER: Set the book page index to the current dream's page when the book is opened
  const handleOpenBook = () => {
      // 1. Find the index of the current dream's page in the availablePages array
      const currentPageIndex = availablePages.findIndex(
          p => p.type === 'DREAM_GATE' && p.targetDreamId === currentDreamSlug
      );
      
      // 2. Set the book page index to the current dream page, or default to 0 if not found
      if (currentPageIndex !== -1) {
          setBookPageIndex(currentPageIndex);
      } else {
          setBookPageIndex(0); 
      }

      // 3. Open the book
      setBookOpen(true);
  };

  const handleInteractStation = (targetStation: any) => {
    checkPageUnlock(currentDreamSlug); 

    updateProgress('VISIT_STATION', targetStation.id);
    if (targetStation.position_index === 0) {
        updateProgress('CENTRAL_OPEN');
    }

    let frames = getEntityFrames(targetStation);

    setActiveEntity({
        name: targetStation.entity_name,
        stationId: targetStation.id,
        description: targetStation.written_description,
        greeting: targetStation.entity_greeting || targetStation.greeting,
        monologue: targetStation.entity_monologue || "",
        options: targetStation.interaction_options || ["Observe closely"],
        frames: frames
    });
  };

  const handleOptionSelect = async (option: string) => {
    updateProgress('INTERACT');
    
    if (!activeEntity || !dreamData) return;
    setInteractionLoading(true);

    try {
        setTimeout(() => {
             setInteractionLoading(false);
             setActiveEntity(prev => ({
                 ...prev,
                 greeting: `The entity responded to your inquiry: "${option}".`,
                 monologue: "The threads of the dream shift slightly.",
                 options: ["Ask something else"]
             }));
        }, 1000);

    } catch (e) {
        Alert.alert("Connection Error", "The dream resists your touch. (API Error)");
        setInteractionLoading(false);
    }
  };

  const handleBookAction = (page: BookPage) => {
      if (page.type === 'DREAM_GATE' && page.targetDreamId) {
          if (isExiting || nextDreamSlug) return;
          setNextDreamSlug(page.targetDreamId); 
          setIsExiting(true); 
          setBookOpen(false); 
      } else if (page.type === 'CREDITS_UNLOCK') {
           Alert.alert("The Great Work", "You have restored the Hexarchia Oneirica!");
      }
  };

  const handleExitAnimationComplete = () => {
    if (nextDreamSlug) {
        loadFromJSON(nextDreamSlug);
        setCurrentDreamSlug(nextDreamSlug); 
        setIsExiting(false);
        setNextDreamSlug(null);
        setFoundPageNotification(null);
        
        const gateIndex = availablePages.findIndex(p => p.targetDreamId === nextDreamSlug);
        if (gateIndex !== -1) {
             setBookPageIndex(gateIndex);
        } else {
             setBookPageIndex(0);
        }
    }
  };
  
  const getEntityFrames = (station: any) => {
      if (station.generated_assets) {
          const stance = station.current_stance || 'idle';
          if (station.generated_assets[stance]) return station.generated_assets[stance].file_paths;
          if (station.generated_assets['idle']) return station.generated_assets['idle'].file_paths;
          const k = Object.keys(station.generated_assets)[0];
          return k ? station.generated_assets[k].file_paths : [];
      }
      return station.sprite_frames || [];
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar hidden />
        
        {loading || (!dreamData && !isExiting) ? ( 
             <View style={styles.center}>
                 <ActivityIndicator size="large" color="#d7ccc8" />
                 <Text style={{color: '#d7ccc8', marginTop: 10}}>Entering Dream...</Text>
             </View>
        ) : (
            <DreamScene 
                key={currentDreamSlug} 
                dreamData={dreamData}
                bookText={currentBookText} 
                onOpenBook={handleOpenBook}
                onInteractStation={handleInteractStation}
                isExiting={isExiting} 
                onExitAnimationComplete={handleExitAnimationComplete} 
            />
        )}

        <MusicPlayer currentDreamSlug={currentDreamSlug} isExiting={isExiting} />
        
        <BookReader 
            visible={isBookOpen}
            onClose={() => setBookOpen(false)}
            pages={availablePages}
            pageIndex={bookPageIndex}       
            setPageIndex={setBookPageIndex} 
            onAction={handleBookAction}
            currentDreamSlug={currentDreamSlug}
        />

        {activeEntity && (
            <EntityDialog 
                visible={!!activeEntity}
                entityName={activeEntity.name}
                description={activeEntity.description}
                greeting={activeEntity.greeting}
                monologue={activeEntity.monologue}
                options={activeEntity.options}
                frames={getEntityFrames(dreamData.stations.find((s: any) => s.id === activeEntity.stationId))} 
                isLoading={interactionLoading}
                onSelectOption={handleOptionSelect}
                onClose={() => {
                    setActiveEntity(null);
                    setFoundPageNotification(null); 
                }}
                foundPage={foundPageNotification} 
            />
        )}
        
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});