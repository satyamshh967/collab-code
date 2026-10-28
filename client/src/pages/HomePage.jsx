import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateRoom from '../components/Room/CreateRoom';
import JoinRoom from '../components/Room/JoinRoom';
import { api } from '../services/api';
import { Sparkles, Users, ArrowRight, Zap, RefreshCw, Copy, Check } from 'lucide-react';

const LANGUAGE_SNIPPETS = {
  javascript: {
    filename: 'index.js',
    raw: `// Collaborative Sandbox Engine (CRDT + Docker)
import { YDoc, WebsocketProvider } from 'collab-code';

const doc = new YDoc();
const awareness = doc.getAwareness();

awareness.setLocalStateField('user', {
  name: 'Developer',
  color: '#8b5cf6',
  cursor: { line: 12, column: 4 }
});

export async function executeSandbox(source, lang) {
  return await runner.dispatch({ code: source, language: lang });
}`,
    render: () => (
      <>
        <span style={{ color: '#71717a' }}>{'// Collaborative Sandbox Engine (CRDT + Docker)'}</span>{'\n'}
        <span style={{ color: '#c084fc' }}>import</span> {'{ YDoc, WebsocketProvider }'} <span style={{ color: '#c084fc' }}>from</span> <span style={{ color: '#38bdf8' }}>'collab-code'</span>;{'\n\n'}
        <span style={{ color: '#c084fc' }}>const</span> <span style={{ color: '#fbbf24' }}>doc</span> = <span style={{ color: '#c084fc' }}>new</span> <span style={{ color: '#34d399' }}>YDoc</span>();{'\n'}
        <span style={{ color: '#c084fc' }}>const</span> <span style={{ color: '#fbbf24' }}>awareness</span> = doc.<span style={{ color: '#60a5fa' }}>getAwareness</span>();{'\n\n'}
        awareness.<span style={{ color: '#60a5fa' }}>setLocalStateField</span>(<span style={{ color: '#38bdf8' }}>'user'</span>, {'{'}{'\n'}
        {'  '}name: <span style={{ color: '#38bdf8' }}>'Developer'</span>,{'\n'}
        {'  '}color: <span style={{ color: '#a78bfa' }}>'#8b5cf6'</span>,{'\n'}
        {'  '}cursor: {'{ '}line: <span style={{ color: '#f59e0b' }}>12</span>, column: <span style={{ color: '#f59e0b' }}>4</span> {'}'}{'\n'}
        {'}'});{'\n\n'}
        <span style={{ color: '#c084fc' }}>export async function</span> <span style={{ color: '#60a5fa' }}>executeSandbox</span>(source, lang) {'{'}{'\n'}
        {'  '}<span style={{ color: '#c084fc' }}>return await</span> runner.<span style={{ color: '#60a5fa' }}>dispatch</span>({'{ '}code: source, language: lang {'}'});{'\n'}
        {'}'}
      </>
    )
  },
  go: {
    filename: 'main.go',
    raw: `// Collaborative Sandbox Engine (CRDT + Docker)
package main

import (
	"fmt"
	"time"
)

type Collaborator struct {
	Username string \`json:"username"\`
	Color    string \`json:"color"\`
}

func main() {
	peer := Collaborator{Username: "Developer", Color: "#8b5cf6"}
	fmt.Printf("Connected peer %s to room [awareness active]\\n", peer.Username)

	start := time.Now()
	// Sandboxed Docker container runner
	fmt.Printf("Execution completed in %v with exit code 0\\n", time.Since(start))
}`,
    render: () => (
      <>
        <span style={{ color: '#71717a' }}>{'// Collaborative Sandbox Engine (CRDT + Docker)'}</span>{'\n'}
        <span style={{ color: '#c084fc' }}>package</span> <span style={{ color: '#f4f4f5' }}>main</span>{'\n\n'}
        <span style={{ color: '#c084fc' }}>import</span> ({'\n'}
        {'  '}<span style={{ color: '#38bdf8' }}>"fmt"</span>{'\n'}
        {'  '}<span style={{ color: '#38bdf8' }}>"time"</span>{'\n'}
        ){'\n\n'}
        <span style={{ color: '#c084fc' }}>type</span> <span style={{ color: '#34d399' }}>Collaborator</span> <span style={{ color: '#c084fc' }}>struct</span> {'{'}{'\n'}
        {'  '}Username <span style={{ color: '#60a5fa' }}>string</span> <span style={{ color: '#38bdf8' }}>`json:"username"`</span>{'\n'}
        {'  '}Color    <span style={{ color: '#60a5fa' }}>string</span> <span style={{ color: '#38bdf8' }}>`json:"color"`</span>{'\n'}
        {'}'}{'\n\n'}
        <span style={{ color: '#c084fc' }}>func</span> <span style={{ color: '#60a5fa' }}>main</span>() {'{'}{'\n'}
        {'  '}peer := <span style={{ color: '#34d399' }}>Collaborator</span>{'{'}Username: <span style={{ color: '#38bdf8' }}>"Developer"</span>, Color: <span style={{ color: '#a78bfa' }}>"#8b5cf6"</span>{'}'}{'\n'}
        {'  '}fmt.<span style={{ color: '#60a5fa' }}>Printf</span>(<span style={{ color: '#38bdf8' }}>"Connected peer %s to room [awareness active]\\n"</span>, peer.Username){'\n\n'}
        {'  '}start := time.<span style={{ color: '#60a5fa' }}>Now</span>(){'\n'}
        {'  '}<span style={{ color: '#71717a' }}>{'// Sandboxed Docker container runner'}</span>{'\n'}
        {'  '}fmt.<span style={{ color: '#60a5fa' }}>Printf</span>(<span style={{ color: '#38bdf8' }}>"Execution completed in %v with exit code 0\\n"</span>, time.<span style={{ color: '#60a5fa' }}>Since</span>(start)){'\n'}
        {'}'}
      </>
    )
  },
  python: {
    filename: 'main.py',
    raw: `# Collaborative Sandbox Engine (CRDT + Docker)
from collab_engine import SessionWorker, YDocAwareness
import time

doc = YDocAwareness(room_id="room-784")
doc.set_user_presence(username="Developer", color="#8b5cf6")

def execute_sandbox(source: str, lang: str = "python"):
    runner = SessionWorker.spawn(isolated=True, timeout_sec=5.0)
    result = runner.execute(code=source)
    print(f"Executed in {result.elapsed_ms}ms with exit code 0")
    return result

if __name__ == "__main__":
    execute_sandbox("print('Hello from isolated container!')")`,
    render: () => (
      <>
        <span style={{ color: '#71717a' }}>{'# Collaborative Sandbox Engine (CRDT + Docker)'}</span>{'\n'}
        <span style={{ color: '#c084fc' }}>from</span> <span style={{ color: '#f4f4f5' }}>collab_engine</span> <span style={{ color: '#c084fc' }}>import</span> <span style={{ color: '#34d399' }}>SessionWorker</span>, <span style={{ color: '#34d399' }}>YDocAwareness</span>{'\n'}
        <span style={{ color: '#c084fc' }}>import</span> <span style={{ color: '#f4f4f5' }}>time</span>{'\n\n'}
        doc = <span style={{ color: '#34d399' }}>YDocAwareness</span>(room_id=<span style={{ color: '#38bdf8' }}>"room-784"</span>){'\n'}
        doc.<span style={{ color: '#60a5fa' }}>set_user_presence</span>(username=<span style={{ color: '#38bdf8' }}>"Developer"</span>, color=<span style={{ color: '#a78bfa' }}>"#8b5cf6"</span>){'\n\n'}
        <span style={{ color: '#c084fc' }}>def</span> <span style={{ color: '#60a5fa' }}>execute_sandbox</span>(source: <span style={{ color: '#60a5fa' }}>str</span>, lang: <span style={{ color: '#60a5fa' }}>str</span> = <span style={{ color: '#38bdf8' }}>"python"</span>):{'\n'}
        {'  '}runner = <span style={{ color: '#34d399' }}>SessionWorker</span>.<span style={{ color: '#60a5fa' }}>spawn</span>(isolated=<span style={{ color: '#f59e0b' }}>True</span>, timeout_sec=<span style={{ color: '#f59e0b' }}>5.0</span>){'\n'}
        {'  '}result = runner.<span style={{ color: '#60a5fa' }}>execute</span>(code=source){'\n'}
        {'  '}<span style={{ color: '#60a5fa' }}>print</span>{'('}<span style={{ color: '#38bdf8' }}>{'f"Executed in {result.elapsed_ms}ms with exit code 0"'}</span>{')'}{'\n'}
        {'  '}<span style={{ color: '#c084fc' }}>return</span> result{'\n\n'}
        <span style={{ color: '#c084fc' }}>if</span> __name__ == <span style={{ color: '#38bdf8' }}>"__main__"</span>:{'\n'}
        {'  '}<span style={{ color: '#60a5fa' }}>execute_sandbox</span>{'('}<span style={{ color: '#38bdf8' }}>"print('Hello from isolated container!')"</span>{')'}{'\n'}
      </>
    )
  },
  typescript: {
    filename: 'index.ts',
    raw: `// Collaborative Sandbox Engine (CRDT + Docker)
import { YDoc, AwarenessUser } from 'collab-code';

interface WorkspaceState {
  readonly roomId: string;
  user: AwarenessUser;
}

const doc = new YDoc<WorkspaceState>();
doc.setAwareness({
  name: 'Developer',
  color: '#8b5cf6',
  cursor: { line: 12, column: 4 }
});

export const runSandbox = async (code: string): Promise<number> => {
  return await runner.execute({ code, lang: 'typescript' });
};`,
    render: () => (
      <>
        <span style={{ color: '#71717a' }}>{'// Collaborative Sandbox Engine (CRDT + Docker)'}</span>{'\n'}
        <span style={{ color: '#c084fc' }}>import</span> {'{ YDoc, AwarenessUser }'} <span style={{ color: '#c084fc' }}>from</span> <span style={{ color: '#38bdf8' }}>'collab-code'</span>;{'\n\n'}
        <span style={{ color: '#c084fc' }}>interface</span> <span style={{ color: '#34d399' }}>WorkspaceState</span> {'{'}{'\n'}
        {'  '}<span style={{ color: '#c084fc' }}>readonly</span> roomId: <span style={{ color: '#60a5fa' }}>string</span>;{'\n'}
        {'  '}user: <span style={{ color: '#34d399' }}>AwarenessUser</span>;{'\n'}
        {'}'}{'\n\n'}
        <span style={{ color: '#c084fc' }}>const</span> <span style={{ color: '#fbbf24' }}>doc</span> = <span style={{ color: '#c084fc' }}>new</span> <span style={{ color: '#34d399' }}>YDoc</span>&lt;<span style={{ color: '#34d399' }}>WorkspaceState</span>&gt;();{'\n'}
        doc.<span style={{ color: '#60a5fa' }}>setAwareness</span>({'{'}{'\n'}
        {'  '}name: <span style={{ color: '#38bdf8' }}>'Developer'</span>,{'\n'}
        {'  '}color: <span style={{ color: '#a78bfa' }}>'#8b5cf6'</span>,{'\n'}
        {'  '}cursor: {'{ '}line: <span style={{ color: '#f59e0b' }}>12</span>, column: <span style={{ color: '#f59e0b' }}>4</span> {'}'}{'\n'}
        {'}'});{'\n\n'}
        <span style={{ color: '#c084fc' }}>export const</span> <span style={{ color: '#60a5fa' }}>runSandbox</span> = <span style={{ color: '#c084fc' }}>async</span> (code: <span style={{ color: '#60a5fa' }}>string</span>): <span style={{ color: '#34d399' }}>Promise</span>&lt;<span style={{ color: '#60a5fa' }}>number</span>&gt; =&gt; {'{'}{'\n'}
        {'  '}<span style={{ color: '#c084fc' }}>return await</span> runner.<span style={{ color: '#60a5fa' }}>execute</span>({'{ '}code, lang: <span style={{ color: '#38bdf8' }}>'typescript'</span> {'}'});{'\n'}
        {'}'};
      </>
    )
  },
  rust: {
    filename: 'main.rs',
    raw: `// Collaborative Sandbox Engine (CRDT + Docker)
use std::time::Instant;

struct Collaborator {
    username: String,
    color: &'static str,
    cursor_pos: (usize, usize),
}

fn main() {
    let peer = Collaborator {
        username: String::from("Developer"),
        color: "#8b5cf6",
        cursor_pos: (12, 4),
    };
    println!("Peer {} joined CRDT session", peer.username);

    let start = Instant::now();
    println!("Sandbox execution finished in {:?}", start.elapsed());
}`,
    render: () => (
      <>
        <span style={{ color: '#71717a' }}>{'// Collaborative Sandbox Engine (CRDT + Docker)'}</span>{'\n'}
        <span style={{ color: '#c084fc' }}>use</span> std::time::<span style={{ color: '#34d399' }}>Instant</span>;{'\n\n'}
        <span style={{ color: '#c084fc' }}>struct</span> <span style={{ color: '#34d399' }}>Collaborator</span> {'{'}{'\n'}
        {'  '}username: <span style={{ color: '#60a5fa' }}>String</span>,{'\n'}
        {'  '}color: &amp;<span style={{ color: '#c084fc' }}>'static</span> <span style={{ color: '#60a5fa' }}>str</span>,{'\n'}
        {'  '}cursor_pos: (<span style={{ color: '#60a5fa' }}>usize</span>, <span style={{ color: '#60a5fa' }}>usize</span>),{'\n'}
        {'}'}{'\n\n'}
        <span style={{ color: '#c084fc' }}>fn</span> <span style={{ color: '#60a5fa' }}>main</span>() {'{'}{'\n'}
        {'  '}<span style={{ color: '#c084fc' }}>let</span> peer = <span style={{ color: '#34d399' }}>Collaborator</span> {'{'}{'\n'}
        {'    '}username: <span style={{ color: '#60a5fa' }}>String</span>::<span style={{ color: '#60a5fa' }}>from</span>(<span style={{ color: '#38bdf8' }}>"Developer"</span>),{'\n'}
        {'    '}color: <span style={{ color: '#a78bfa' }}>"#8b5cf6"</span>,{'\n'}
        {'    '}cursor_pos: (<span style={{ color: '#f59e0b' }}>12</span>, <span style={{ color: '#f59e0b' }}>4</span>),{'\n'}
        {'  '}{'}'};{'\n'}
        {'  '}<span style={{ color: '#60a5fa' }}>println!</span>{'('}<span style={{ color: '#38bdf8' }}>{'"Peer {} joined CRDT session"'}</span>, peer.username{')'};{'\n\n'}
        {'  '}<span style={{ color: '#c084fc' }}>let</span> start = <span style={{ color: '#34d399' }}>Instant</span>::<span style={{ color: '#60a5fa' }}>now</span>();{'\n'}
        {'  '}<span style={{ color: '#60a5fa' }}>println!</span>{'('}<span style={{ color: '#38bdf8' }}>{'"Sandbox execution finished in {:?}"'}</span>, start.<span style={{ color: '#60a5fa' }}>elapsed</span>(){')'};{'\n'}
        {'}'}
      </>
    )
  },
  java: {
    filename: 'Main.java',
    raw: `// Collaborative Sandbox Engine (CRDT + Docker)
package com.collabcode.sandbox;

public class Main {
    public static void main(String[] args) {
        String peer = "Developer";
        String color = "#8b5cf6";
        
        System.out.println("Syncing Yjs CRDT model for: " + peer);
        long start = System.currentTimeMillis();
        
        // Execute inside container sandbox
        System.out.println("Sandboxed process exited in " + (System.currentTimeMillis() - start) + "ms");
    }
}`,
    render: () => (
      <>
        <span style={{ color: '#71717a' }}>{'// Collaborative Sandbox Engine (CRDT + Docker)'}</span>{'\n'}
        <span style={{ color: '#c084fc' }}>package</span> <span style={{ color: '#f4f4f5' }}>com.collabcode.sandbox</span>;{'\n\n'}
        <span style={{ color: '#c084fc' }}>public class</span> <span style={{ color: '#34d399' }}>Main</span> {'{'}{'\n'}
        {'  '}<span style={{ color: '#c084fc' }}>public static void</span> <span style={{ color: '#60a5fa' }}>main</span>(<span style={{ color: '#34d399' }}>String</span>[] args) {'{'}{'\n'}
        {'    '}<span style={{ color: '#34d399' }}>String</span> peer = <span style={{ color: '#38bdf8' }}>"Developer"</span>;{'\n'}
        {'    '}<span style={{ color: '#34d399' }}>String</span> color = <span style={{ color: '#a78bfa' }}>"#8b5cf6"</span>;{'\n\n'}
        {'    '}<span style={{ color: '#34d399' }}>System</span>.out.<span style={{ color: '#60a5fa' }}>println</span>(<span style={{ color: '#38bdf8' }}>"Syncing Yjs CRDT model for: "</span> + peer);{'\n'}
        {'    '}<span style={{ color: '#60a5fa' }}>long</span> start = <span style={{ color: '#34d399' }}>System</span>.<span style={{ color: '#60a5fa' }}>currentTimeMillis</span>();{'\n\n'}
        {'    '}<span style={{ color: '#71717a' }}>{'// Execute inside container sandbox'}</span>{'\n'}
        {'    '}<span style={{ color: '#34d399' }}>System</span>.out.<span style={{ color: '#60a5fa' }}>println</span>(<span style={{ color: '#38bdf8' }}>"Sandboxed process exited in "</span> + (<span style={{ color: '#34d399' }}>System</span>.<span style={{ color: '#60a5fa' }}>currentTimeMillis</span>() - start) + <span style={{ color: '#38bdf8' }}>"ms"</span>);{'\n'}
        {'  '}{'}'}{'\n'}
        {'}'}
      </>
    )
  },
  cpp: {
    filename: 'main.cpp',
    raw: `// Collaborative Sandbox Engine (CRDT + Docker)
#include <iostream>
#include <string>
#include <chrono>

struct PeerPresence {
    std::string username = "Developer";
    std::string color = "#8b5cf6";
};

int main() {
    PeerPresence peer;
    std::cout << "CRDT synchronized peer: " << peer.username << std::endl;
    
    auto start = std::chrono::high_resolution_clock::now();
    std::cout << "Sandboxed container execution exited with status 0" << std::endl;
    return 0;
}`,
    render: () => (
      <>
        <span style={{ color: '#71717a' }}>{'// Collaborative Sandbox Engine (CRDT + Docker)'}</span>{'\n'}
        <span style={{ color: '#c084fc' }}>#include</span> <span style={{ color: '#38bdf8' }}>&lt;iostream&gt;</span>{'\n'}
        <span style={{ color: '#c084fc' }}>#include</span> <span style={{ color: '#38bdf8' }}>&lt;string&gt;</span>{'\n'}
        <span style={{ color: '#c084fc' }}>#include</span> <span style={{ color: '#38bdf8' }}>&lt;chrono&gt;</span>{'\n\n'}
        <span style={{ color: '#c084fc' }}>struct</span> <span style={{ color: '#34d399' }}>PeerPresence</span> {'{'}{'\n'}
        {'  '}std::string username = <span style={{ color: '#38bdf8' }}>"Developer"</span>;{'\n'}
        {'  '}std::string color = <span style={{ color: '#a78bfa' }}>"#8b5cf6"</span>;{'\n'}
        {'}'};{'\n\n'}
        <span style={{ color: '#60a5fa' }}>int</span> <span style={{ color: '#60a5fa' }}>main</span>() {'{'}{'\n'}
        {'  '}<span style={{ color: '#34d399' }}>PeerPresence</span> peer;{'\n'}
        {'  '}std::cout &lt;&lt; <span style={{ color: '#38bdf8' }}>"CRDT synchronized peer: "</span> &lt;&lt; peer.username &lt;&lt; std::endl;{'\n\n'}
        {'  '}<span style={{ color: '#c084fc' }}>auto</span> start = std::chrono::high_resolution_clock::<span style={{ color: '#60a5fa' }}>now</span>();{'\n'}
        {'  '}std::cout &lt;&lt; <span style={{ color: '#38bdf8' }}>"Sandboxed container execution exited with status 0"</span> &lt;&lt; std::endl;{'\n'}
        {'  '}<span style={{ color: '#c084fc' }}>return</span> <span style={{ color: '#f59e0b' }}>0</span>;{'\n'}
        {'}'}
      </>
    )
  }
};

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [activeRooms, setActiveRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const rooms = await api.getRooms();
      setActiveRooms(rooms || []);
    } catch (e) {
      setActiveRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleInstantScratchpad = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const randId = `${Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}-${Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`;
    navigate(`/room/${randId}`);
  };

  const currentSnippet = LANGUAGE_SNIPPETS[selectedLanguage] || LANGUAGE_SNIPPETS.javascript;

  const copySampleCode = async () => {
    try {
      await navigator.clipboard.writeText(currentSnippet.raw);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Navbar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 2rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#ffffff',
            fontSize: '0.85rem'
          }}>
            ⚡
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.3px', color: '#f4f4f5' }}>
            Code<span style={{ color: '#a78bfa' }}>Collab</span>
          </span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '4px',
            background: '#1f1f26',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontWeight: 600,
            letterSpacing: '0.04em'
          }}>
            v2.0
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="btn"
            onClick={handleInstantScratchpad}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', borderRadius: '6px' }}
          >
            <Zap size={14} color="#a78bfa" />
            <span>Instant Scratchpad</span>
          </button>
        </div>
      </nav>

      {/* Main Full-Width Content Viewport */}
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem 1.5rem 3rem 1.5rem',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        {/* Hero Banner */}
        <div style={{ textAlign: 'left', maxWidth: '820px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            padding: '0.25rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#c4b5fd',
            fontWeight: 600,
            marginBottom: '0.85rem'
          }}>
            <span className="status-dot pulsing" style={{ width: '6px', height: '6px', background: '#10b981' }} />
            <span>Real-Time Collaborative CRDT Environment</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.85rem)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: '0.6rem', color: '#f4f4f5' }}>
            Code Together. <span style={{ color: '#a78bfa' }}>Zero Conflicts.</span>
          </h1>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.55 }}>
            Sub-millisecond cursor awareness, sandboxed multi-language execution containers, and deterministic state convergence.
          </p>
        </div>

        {/* Dashboard 2-Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.75rem',
          width: '100%',
          alignItems: 'start'
        }}>
          {/* Left Column: Room Setup Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
            {/* Tab Switcher */}
            <div style={{
              display: 'flex',
              background: '#131316',
              padding: '3px',
              borderRadius: '6px',
              marginBottom: '1.25rem',
              border: '1px solid var(--border)'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: activeTab === 'create' ? '1px solid #8b5cf6' : '1px solid transparent',
                  background: activeTab === 'create' ? 'rgba(139, 92, 246, 0.14)' : 'transparent',
                  color: activeTab === 'create' ? '#f4f4f5' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={14} color={activeTab === 'create' ? '#a78bfa' : 'currentColor'} />
                Create Room
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('join')}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: activeTab === 'join' ? '1px solid #8b5cf6' : '1px solid transparent',
                  background: activeTab === 'join' ? 'rgba(139, 92, 246, 0.14)' : 'transparent',
                  color: activeTab === 'join' ? '#f4f4f5' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Users size={14} color={activeTab === 'join' ? '#a78bfa' : 'currentColor'} />
                Join Room
              </button>
            </div>

            {activeTab === 'create' ? (
              <CreateRoom 
                selectedLanguage={selectedLanguage} 
                onLanguageChange={setSelectedLanguage} 
              />
            ) : (
              <JoinRoom />
            )}
          </div>

          {/* Right Column: Code Editor Workbench Preview & Active Rooms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Workbench Code Editor Preview Styled after Reference */}
            <div className="glass-panel" style={{ overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.65rem 1rem',
                borderBottom: '1px solid var(--border)',
                background: '#141418',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', userSelect: 'none' }}>
                    CODE EDITOR
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    color: '#a78bfa',
                    background: 'rgba(139, 92, 246, 0.14)',
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    letterSpacing: '0.04em'
                  }}>
                    {currentSnippet.filename}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copySampleCode}
                  style={{
                    background: '#1d1d22',
                    border: '1px solid #2e2e38',
                    color: '#e4e4e7',
                    borderRadius: '5px',
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    userSelect: 'none'
                  }}
                >
                  {copiedSnippet ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{ padding: '1rem', background: '#111113', overflowX: 'auto', userSelect: 'none', WebkitUserSelect: 'none' }}>
                <pre style={{
                  margin: 0,
                  fontFamily: "'Fira Code', 'Consolas', monospace",
                  fontSize: '0.8rem',
                  lineHeight: '1.6',
                  color: '#e4e4e7',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  cursor: 'default'
                }}>
                  <code style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                    {currentSnippet.render()}
                  </code>
                </pre>
              </div>
            </div>

            {/* Active Public Rooms */}
            <div className="glass-panel" style={{ padding: '1.25rem', userSelect: 'none', WebkitUserSelect: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ACTIVE WORKSPACES ({activeRooms.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchRooms}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    userSelect: 'none'
                  }}
                >
                  <RefreshCw size={12} className={isLoadingRooms ? 'spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {activeRooms.length === 0 ? (
                <div style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: '#131316',
                  borderRadius: '6px',
                  border: '1px dashed var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                  userSelect: 'none'
                }}>
                  No public sessions running. Create a new room to start collaborating!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => navigate(`/room/${room.id}`)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#141418',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease',
                        userSelect: 'none'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f4f4f5', marginBottom: '2px' }}>
                          {room.name || `Room #${room.id.slice(0, 8)}`}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: '#a78bfa', fontWeight: 600, textTransform: 'uppercase' }}>{room.language}</span>
                          <span>•</span>
                          <span style={{ color: '#10b981' }}>{room.usersCount || 1} online</span>
                        </div>
                      </div>
                      <ArrowRight size={14} color="#a78bfa" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
