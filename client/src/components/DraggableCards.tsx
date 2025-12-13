import { ReactNode, useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { fadeInScale } from '@/lib/animations';

const CARD_ORDER_KEY = 'dashboard-card-order';

interface CardItem {
  id: string;
  content: ReactNode;
}

interface SortableCardProps {
  id: string;
  children: ReactNode;
}

function SortableCard({ id, children }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      variants={fadeInScale}
    >
      {children}
    </motion.div>
  );
}

interface DraggableCardsProps {
  cards: CardItem[];
}

export function DraggableCards({ cards }: DraggableCardsProps) {
  const [items, setItems] = useState<CardItem[]>(cards);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem(CARD_ORDER_KEY);
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        // Reorder cards based on saved order
        const reordered = orderIds
          .map(id => cards.find(card => card.id === id))
          .filter((card): card is CardItem => card !== undefined);
        
        // Add any new cards that weren't in the saved order
        const newCards = cards.filter(card => !orderIds.includes(card.id));
        setItems([...reordered, ...newCards]);
      } catch (e) {
        setItems(cards);
      }
    } else {
      setItems(cards);
    }
  }, [cards]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save new order to localStorage
        const orderIds = newOrder.map(item => item.id);
        localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(orderIds));
        
        return newOrder;
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <SortableCard key={item.id} id={item.id}>
              {item.content}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
