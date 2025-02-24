import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import {
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Viewport,
} from '@xyflow/react';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useFlowManagerContext } from '@/pages/FlowWorkspace'; // Import the context hook
import { useShallow } from 'zustand/react/shallow';

const initialEdges = [] as Edge[];
const initialNodes = [
  {
    id: '0',
    type: 'OpenAlex',
    position: { x: 0, y: 0 },
    data: { value: 123 },
  },
  { 
    id: 'PZqlVzR4Y5W_m7ouhq2Q8',
    type: 'Core',
    data: { filter: '' },
    position: { x: 88, y: 356 },
  },
] as Node[];

// Define FlowState with only data properties
type FlowState = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
};

// Define FlowStore with logic for managing flows
type FlowStore = {
  flows: Record<string, FlowState>;
  currentFlowId: string;
  
  createFlow: (flowId: string, nodes, edges) => void;
  setCurrentFlow: (flowId: string) => void;
  renameCurrentFlow: (newName: string) => void;
  deleteFlow: (flowId: string) => void;

  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: Viewport) => void;
  clearState: () => void;
  addNode: (newNode: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, newPosition: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, newData: object) => void;

  currentFlow: () => FlowState | null; // Getter function
};

const initialViewport: Viewport = { x: 0, y: 0, zoom: 1 };

const useStore = create<FlowStore>()(
  persist(
    (set, get) => ({
      flows: {}, 
      currentFlowId: '',

      createFlow: (flowId: string, nodes, edges) => {
        set((state) => ({
          flows: {
            ...state.flows,
            [flowId]: { nodes: nodes, edges: edges, viewport: initialViewport },
          },
          currentFlowId: flowId,
        }));
      },

      setCurrentFlow: (flowId: string) => {
        if (get().flows[flowId]) {
          set({ currentFlowId: flowId });
        }
      },

      renameCurrentFlow: (newName: string) => {
        const { currentFlowId, flows } = get();
        if (!flows[currentFlowId]) return;

        const updatedFlows = { ...flows, [newName]: flows[currentFlowId] };
        delete updatedFlows[currentFlowId];

        set({ flows: updatedFlows, currentFlowId: newName });
      },

      deleteFlow: (flowId: string) => {
        set((state) => {
          const updatedFlows = { ...state.flows };
          delete updatedFlows[flowId];

          return {
            flows: updatedFlows,
            currentFlowId: Object.keys(updatedFlows)[0] || '',
          };
        });
      },

      currentFlow: () => get().flows[get().currentFlowId] || null,

      // Node and Edge management
      onNodesChange: (changes) => {
        set((state) => {
          const flow = state.flows[state.currentFlowId];
          if (!flow) return {};
      
          return {
            flows: {
              ...state.flows,
              [state.currentFlowId]: {
                ...flow,
                nodes: applyNodeChanges(changes, flow.nodes),
              },
            },
          };
        }, false); // Avoid triggering unnecessary re-renders
      },
      
      onEdgesChange: (changes) => {
        set((state) => {
          const flow = state.flows[state.currentFlowId];
          if (!flow) return {};
      
          return {
            flows: {
              ...state.flows,
              [state.currentFlowId]: {
                ...flow,
                edges: applyEdgeChanges(changes, flow.edges),
              },
            },
          };
        }, false);
      },      

      onConnect: (connection) => {
        const { currentFlowId, flows } = get();
        if (!flows[currentFlowId]) return;
        set({
          flows: {
            ...flows,
            [currentFlowId]: {
              ...flows[currentFlowId],
              edges: addEdge({ ...connection, type: 'smoothstep' }, flows[currentFlowId].edges),
            },
          },
        });
      },

      setNodes: (nodes) => {
        const { currentFlowId, flows } = get();
        if (!flows[currentFlowId]) return;
        set({
          flows: { ...flows, [currentFlowId]: { ...flows[currentFlowId], nodes } },
        });
      },

      setEdges: (edges) => {
        const { currentFlowId, flows } = get();
        if (!flows[currentFlowId]) return;
        set({
          flows: { ...flows, [currentFlowId]: { ...flows[currentFlowId], edges } },
        });
      },

      setViewport: (viewport) => {
        set((state) => {
          const flow = state.flows[state.currentFlowId];
          if (!flow) return {};
      
          return {
            flows: {
              ...state.flows,
              [state.currentFlowId]: {
                ...flow,
                viewport,
              },
            },
          };
        }, false);
      },      

      clearState: () => {
        const { currentFlowId, flows } = get();
        if (!flows[currentFlowId]) return;
        set({
          flows: {
            ...flows,
            [currentFlowId]: { nodes: [], edges: [], viewport: initialViewport },
          },
        });
      },

      addNode: (newNode) => {
        const { currentFlowId, flows } = get();
        if (!flows[currentFlowId]) return;
        set({
          flows: {
            ...flows,
            [currentFlowId]: {
              ...flows[currentFlowId],
              nodes: [...flows[currentFlowId].nodes, newNode],
            },
          },
        });
      },

      removeNode: (nodeId) => {
        const { currentFlowId, flows } = get();
        if (!flows[currentFlowId]) return;
        set({
          flows: {
            ...flows,
            [currentFlowId]: {
              ...flows[currentFlowId],
              nodes: flows[currentFlowId].nodes.filter((node) => node.id !== nodeId),
            },
          },
        });
      },

      updateNodePosition: (nodeId, newPosition) => {
        const { currentFlowId, flows } = get();
        if (!flows[currentFlowId]) return;
        set({
          flows: {
            ...flows,
            [currentFlowId]: {
              ...flows[currentFlowId],
              nodes: flows[currentFlowId].nodes.map((node) =>
                node.id === nodeId ? { ...node, position: newPosition } : node
              ),
            },
          },
        });
      },

      updateNodeData: (nodeId, newData) => {
        const { currentFlowId, flows } = get();
        if (!flows[currentFlowId]) return;
        set({
          flows: {
            ...flows,
            [currentFlowId]: {
              ...flows[currentFlowId],
              nodes: flows[currentFlowId].nodes.map((node) =>
                node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
              ),
            },
          },
        });
      },
    }),
    {
      name: 'multi-flow-state',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        flows: state.flows,
        currentFlowId: state.currentFlowId,
      }),
    }
  )
);

const selector = (state) => ({
  flows: state.flows,
  currentFlowId: state.currentFlowId,
  createFlow: state.createFlow,
  setCurrentFlow: state.setCurrentFlow,
  renameCurrentFlow: state.renameCurrentFlow,
  deleteFlow: state.deleteFlow,
  currentFlow: state.currentFlow,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  addNode: state.addNode,
  setViewport: state.setViewport,
  clearStore: state.clearStore,
  updateNodeData: state.updateNodeData
});

const nodeSelector = (state) => ({
  nodes: state.flows[state.currentFlowId].nodes,
  edges: state.flows[state.currentFlowId].edges,
  viewport: state.flows[state.currentFlowId].viewport,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  addNode: state.addNode,
  setViewport: state.setViewport,
  updateNodeData: state.updateNodeData
});

const useFlowStore = () => {
  const context = useFlowManagerContext();

  const store = useStore(useShallow(selector));

  if (!context?.isParent) {
    return {
      flows: store.flows,
      currentFlowId: store.currentFlowId,
      createFlow: store.createFlow,
      setCurrentFlow: store.setCurrentFlow,
      renameCurrentFlow: store.renameCurrentFlow,
      currentFlow: store.currentFlow
    };
  }
  else{
    return nodeSelector(store);
  }
}
export default useFlowStore;