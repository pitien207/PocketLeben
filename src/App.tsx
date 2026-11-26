import { useEffect, type ReactNode } from 'react'
import { Game } from './game/Game'
import { installDebugHooks } from './game/systems/debug'
import { bindKeyboard } from './game/systems/input'
import { useSettings } from './store/settingsStore'
import { ActionButtons } from './ui/ActionButtons'
import { BagPanel } from './ui/BagPanel'
import { CarePanel, CareResults } from './ui/CarePanel'
import { ClothesPanel } from './ui/ClothesPanel'
import { MinigameHost } from './game/minigames/MinigameHost'
import { QuestLog } from './ui/QuestLog'
import { EndingPanel } from './ui/EndingPanel'
import { MapPanel } from './ui/MapView'
import { PhonePanel } from './ui/PhonePanel'
import { RideButton, VehicleShop } from './ui/VehicleShop'
import { CharacterCreate } from './ui/CharacterCreate'
import { SecretCard } from './ui/SecretCard'
import { ChapterCard } from './ui/ChapterCard'
import { TransitionOverlay } from './ui/TransitionOverlay'
import { VisaPanel } from './ui/VisaPanel'
import { ClockPanel } from './ui/ClockPanel'
import { GuideCard, GuideUiPulse, Onboarding } from './ui/Guide'
import { CompassBar } from './ui/CompassBar'
import { UpdatePill } from './ui/UpdatePill'
import { QuestCelebration } from './ui/QuestCelebration'
import { FastForwardOverlay, LocationCard, NewDayCard } from './ui/TimeOverlays'
import { DialogueBox } from './ui/DialogueBox'
import { HUD } from './ui/HUD'
import { Joystick } from './ui/Joystick'
import { LoadingScreen } from './ui/LoadingScreen'
import { SettingsPanel } from './ui/SettingsPanel'
import { ShopPanel } from './ui/ShopPanel'
import { GoldPanel } from './ui/GoldPanel'
import { BoardingPassPanel, FlightBoardPanel } from './ui/BoardingPass'
import { TestPanel } from './ui/TestTools'
import { PickleInvites, PickleLobby } from './ui/PickleLobby'
import { useMinigame } from './store/minigameStore'
import { SleepOverlay } from './ui/SleepOverlay'
import { Toasts } from './ui/Toasts'
import { RotateHint } from './ui/RotateHint'
import { WorkPanel } from './ui/WorkPanel'
import { WorkResults } from './ui/WorkResults'
import { HintProvider } from './ui/kit/Hint'
import { TransitPanel } from './ui/TransitPanel'

installDebugHooks()

/** 1.39: the pickleball match shows the 3D world with its own controls on top — the normal HUD steps aside. */
function OutsideMatch({ children }: { children: ReactNode }) {
  const match = useMinigame((s) => s.active?.kind === 'pickleball')
  return match ? null : <>{children}</>
}

export default function App() {
  const language = useSettings((s) => s.language)

  useEffect(() => bindKeyboard(), [])
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <HintProvider>
    <div className="relative h-full w-full overflow-hidden">
      <Game />
      {/* DOM overlay. Containers ignore pointers so drags fall through to the 3D view. */}
      <div className="pointer-events-none absolute inset-0">
        <OutsideMatch>
          <CompassBar />
          <UpdatePill />
          <QuestCelebration />
          <HUD />
          <LocationCard />
        </OutsideMatch>
        <WorkPanel />
        <CarePanel />
        <OutsideMatch>
          <Joystick />
          <RideButton />
          <ActionButtons />
        </OutsideMatch>
        <DialogueBox />
        <Toasts />
        <WorkResults />
        <CareResults />
        <ShopPanel />
        <GoldPanel />
        <BoardingPassPanel />
        <FlightBoardPanel />
        <TestPanel />
        <ClothesPanel />
        <BagPanel />
        <QuestLog />
        <VisaPanel />
        <ClockPanel />
        <GuideCard />
        <EndingPanel />
        <MapPanel />
        <PhonePanel />
        <VehicleShop />
        <TransitPanel />
        <PickleLobby />
        <PickleInvites />
        <CharacterCreate />
        <SecretCard />
        <ChapterCard />
        <GuideUiPulse />
        <Onboarding />
        <RotateHint />
        <MinigameHost />
        <SettingsPanel />
        <FastForwardOverlay />
        <SleepOverlay />
        <NewDayCard />
        <TransitionOverlay />
      </div>
      <LoadingScreen />
    </div>
    </HintProvider>
  )
}
