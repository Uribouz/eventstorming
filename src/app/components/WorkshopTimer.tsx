import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Clock, Settings } from 'lucide-react';
import { NoteType } from '../types';

interface Phase {
  name: string;
  startMinute: number;
  endMinute: number;
  description: string;
  instructions: string;
  relevantNotes: NoteType[];
  duration: number; // in minutes (proportional)
}

const phaseDefinitions: Omit<Phase, 'startMinute' | 'endMinute' | 'description'>[] = [
  {
    name: 'Identify Domain Events',
    duration: 3,
    instructions: 'Ask "What happens in this process?" Rapidly call out key events in past tense (e.g., "Order Placed", "Payment Confirmed"). Focus on rapid collection without judgment.',
    relevantNotes: ['event'],
  },
  {
    name: 'Arrange the Timeline',
    duration: 2,
    instructions: 'Organize events chronologically from left to right. This discussion reveals different mental models and builds shared understanding.',
    relevantNotes: ['event'],
  },
  {
    name: 'Pain Points',
    duration: 2,
    instructions: 'Identify problems, bottlenecks, and frustrations in the process. Mark issues and questions that need to be resolved.',
    relevantNotes: ['issue'],
  },
  {
    name: 'Pivotal Events',
    duration: 1,
    instructions: 'Highlight the most important events that represent significant changes in the system or business process.',
    relevantNotes: ['event'],
  },
  {
    name: 'Add Commands & Actors',
    duration: 3,
    instructions: 'For each event, identify its triggering command (e.g., "Place Order") and the initiating actor (e.g., "Customer", "System"). Reveal patterns and clarify responsibilities.',
    relevantNotes: ['command', 'user'],
  },
  {
    name: 'Policies',
    duration: 2,
    instructions: 'Define business rules and policies that automatically trigger actions when certain events occur (e.g., "When payment confirmed, send confirmation email").',
    relevantNotes: ['policy'],
  },
  {
    name: 'Read Models',
    duration: 1,
    instructions: 'Identify what information needs to be displayed to users and what queries they need to perform.',
    relevantNotes: ['read-model'],
  },
  {
    name: 'External Systems',
    duration: 1,
    instructions: 'Mark interactions with external services, APIs, and third-party systems that are part of the process.',
    relevantNotes: ['external'],
  },
  {
    name: 'Aggregates',
    duration: 2,
    instructions: 'Group related commands and events around key business entities that maintain consistency (e.g., Order, Customer, Payment).',
    relevantNotes: ['aggregate'],
  },
  {
    name: 'Bounded Contexts',
    duration: 2,
    instructions: 'Identify natural boundaries where the language and rules change. Group aggregates into distinct contexts.',
    relevantNotes: ['aggregate', 'policy'],
  },
  {
    name: 'Clarify & Align',
    duration: 1,
    instructions: 'Review the complete picture, discuss ambiguities, and highlight dependencies. Ensure everyone shares a common understanding.',
    relevantNotes: ['event', 'command', 'aggregate', 'policy', 'external', 'user', 'read-model', 'issue'],
  },
];

const calculatePhases = (totalMinutes: number): Phase[] => {
  const baseTotalDuration = phaseDefinitions.reduce((sum, phase) => sum + phase.duration, 0);
  const scaleFactor = totalMinutes / baseTotalDuration;
  
  let currentStart = 0;
  return phaseDefinitions.map((phaseDef, index) => {
    const scaledDuration = phaseDef.duration * scaleFactor;
    const startMinute = currentStart;
    const endMinute = currentStart + scaledDuration;
    currentStart = endMinute;
    
    const startMin = Math.floor(startMinute);
    const endMin = Math.floor(endMinute);
    
    return {
      ...phaseDef,
      startMinute,
      endMinute,
      description: `Stage ${index + 1} (${startMin}-${endMin} min)`,
    };
  });
};

interface WorkshopTimerProps {
  onPhaseChange?: (relevantNotes: NoteType[], isPivotalEvents: boolean) => void;
}

export function WorkshopTimer({ onPhaseChange }: WorkshopTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState(20);
  const [showSettings, setShowSettings] = useState(false);
  const [tempMinutes, setTempMinutes] = useState('20');

  const phases = calculatePhases(totalMinutes);

  useEffect(() => {
    let interval: number | undefined;
    if (isRunning) {
      interval = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const currentMinute = seconds / 60;
  const currentPhase = phases.find(
    (phase) => currentMinute >= phase.startMinute && currentMinute <= phase.endMinute
  ) || phases[phases.length - 1];

  const isComplete = currentMinute > totalMinutes;

  useEffect(() => {
    if (onPhaseChange) {
      onPhaseChange(currentPhase.relevantNotes, currentPhase.name === 'Pivotal Events');
    }
  }, [currentPhase, onPhaseChange]);

  const toggleTimer = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    setSeconds(0);
    setIsRunning(false);
  }, []);

  const jumpToPhase = useCallback((phase: Phase) => {
    setSeconds(phase.startMinute * 60);
    setIsRunning(false);
  }, []);

  const handleSaveDuration = useCallback(() => {
    const minutes = parseInt(tempMinutes);
    if (minutes > 0 && minutes <= 120) {
      setTotalMinutes(minutes);
      setSeconds(0);
      setIsRunning(false);
      setShowSettings(false);
    }
  }, [tempMinutes]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseProgress = (phase: Phase) => {
    const phaseLength = (phase.endMinute - phase.startMinute) * 60;
    const phaseElapsed = seconds - phase.startMinute * 60;
    return Math.min(Math.max((phaseElapsed / phaseLength) * 100, 0), 100);
  };

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-80 z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">Workshop Timer</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-2xl font-mono font-bold text-gray-900">
            {formatTime(seconds)}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Settings"
          >
            <Settings className="size-5 text-gray-600" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Duration (minutes)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="120"
              value={tempMinutes}
              onChange={(e) => setTempMinutes(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handleSaveDuration}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            >
              Apply
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Stages will be scaled proportionally (1-120 minutes)
          </p>
        </div>
      )}

      {isComplete ? (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="font-semibold text-green-800 text-center">Workshop Complete! 🎉</p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-900">{currentPhase.name}</span>
              <span className="text-xs text-blue-600 font-medium">{currentPhase.description}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${getPhaseProgress(currentPhase)}%` }}
              />
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{currentPhase.instructions}</p>
          </div>

          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {phases.map((phase, index) => {
              const isPast = currentMinute > phase.endMinute;
              const isCurrent = phase === currentPhase;
              const isFuture = currentMinute < phase.startMinute;

              return (
                <button
                  key={index}
                  onClick={() => jumpToPhase(phase)}
                  className={`w-full p-2 rounded text-xs transition-all hover:opacity-80 ${
                    isCurrent
                      ? 'bg-blue-100 border-2 border-blue-400'
                      : isPast
                      ? 'bg-gray-100 text-gray-500'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isCurrent ? 'text-blue-900' : ''}`}>
                      {phase.name}
                    </span>
                    <span className={isCurrent ? 'text-blue-600' : 'text-gray-500'}>
                      {phase.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="flex gap-2">
        <button
          onClick={toggleTimer}
          className={`flex-1 ${
            isRunning ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'
          } text-white px-4 py-2 rounded font-medium flex items-center justify-center gap-2 transition-colors`}
        >
          {isRunning ? (
            <>
              <Pause className="size-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="size-4" />
              {seconds > 0 ? 'Resume' : 'Start'}
            </>
          )}
        </button>
        <button
          onClick={resetTimer}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw className="size-4" />
          Reset
        </button>
      </div>
    </div>
  );
}

export { phaseDefinitions, calculatePhases };