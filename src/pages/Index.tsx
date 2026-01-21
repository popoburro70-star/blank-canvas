import { useBotState } from '@/hooks/useBotState';
import { Header } from '@/components/Header';
import { BotControls } from '@/components/BotControls';
import { FlowChart } from '@/components/FlowChart';
import { ConfigPanel } from '@/components/ConfigPanel';
import { StatsPanel } from '@/components/StatsPanel';
import { LogsPanel } from '@/components/LogsPanel';
import { PythonScriptPanel } from '@/components/PythonScriptPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Settings, ScrollText, LayoutGrid, Code } from 'lucide-react';

const Index = () => {
  const {
    status,
    currentStep,
    config,
    stats,
    logs,
    startBot,
    pauseBot,
    stopBot,
    resumeBot,
    updateConfig,
    clearLogs,
    resetBotState,
    connectionStatus,
    connect,
    disconnect,
    useRealADB,
    toggleRealADB,
    screenshotBase64,
    requestScreenshot,
    tapPercent,
    isConnected,
  } = useBotState();

  return (
    <div className="min-h-screen bg-background">
      <Header 
        status={status} 
        connectionStatus={connectionStatus}
        onConnect={connect}
        onDisconnect={disconnect}
        useRealADB={useRealADB}
        onToggleRealADB={toggleRealADB}
      />
      
      <main className="container py-6 space-y-6">
        {/* Controls */}
        <Card className="border-border bg-card/80 backdrop-blur-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Activity className="w-5 h-5 text-primary" />
                <span className="font-gaming text-sm tracking-wider">CONTROLES DO BOT</span>
                {useRealADB && (
                  <span className="px-2 py-0.5 text-[10px] font-gaming rounded bg-success/20 text-success border border-success/30">
                    MODO REAL
                  </span>
                )}
              </div>
              <BotControls
                status={status}
                onStart={startBot}
                onPause={pauseBot}
                onStop={stopBot}
                onResume={resumeBot}
                forceStopVisible={useRealADB && isConnected}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <StatsPanel stats={stats} />

        {/* Main content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Flow Chart */}
          <Card className="lg:col-span-1 border-border bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-gaming text-sm tracking-wider">
                <LayoutGrid className="w-4 h-4 text-primary" />
                FLUXO DE EXECUÇÃO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FlowChart currentStep={currentStep} />
            </CardContent>
          </Card>

          {/* Config and Logs */}
          <Card className="lg:col-span-2 border-border bg-card/80 backdrop-blur-sm">
            <Tabs defaultValue="config" className="h-full">
              <CardHeader className="pb-3">
                <TabsList className="bg-secondary/50">
                  <TabsTrigger value="config" className="gap-2 font-gaming text-xs tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Settings className="w-3.5 h-3.5" />
                    CONFIGURAÇÃO
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="gap-2 font-gaming text-xs tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <ScrollText className="w-3.5 h-3.5" />
                    LOGS
                  </TabsTrigger>
                  <TabsTrigger value="script" className="gap-2 font-gaming text-xs tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Code className="w-3.5 h-3.5" />
                    SCRIPT
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                  <TabsContent value="config" className="mt-0">
                    <ConfigPanel 
                      config={config} 
                      onUpdate={updateConfig}
                      disabled={status === 'running'}
                      screenshotBase64={screenshotBase64}
                      onRequestScreenshot={requestScreenshot}
                      onTapPercent={tapPercent}
                      onResetBotState={resetBotState}
                      useRealADB={useRealADB}
                      connectionStatus={connectionStatus}
                      isConnected={isConnected}
                      onConnect={connect}
                    />
                  </TabsContent>
                <TabsContent value="logs" className="mt-0">
                  <LogsPanel logs={logs} onClear={clearLogs} />
                </TabsContent>
                <TabsContent value="script" className="mt-0">
                  <PythonScriptPanel />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
