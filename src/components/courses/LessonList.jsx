import React from 'react';
import { List, ListItemButton, ListItemText, ListItemIcon, Chip } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

function LessonList({ lessons, currentLessonId, onSelect }) {
  return (
    <List sx={{ direction: 'rtl' }}>
      {lessons.map((l, idx) => {
        const selected = currentLessonId === l.id;
        return (
          <ListItemButton key={l.id} selected={selected} onClick={() => onSelect?.(l)}>
            <ListItemIcon>
              <PlayCircleOutlineIcon />
            </ListItemIcon>
            <ListItemText
              primary={`${idx + 1}. ${l.title}`}
              secondary={l.durationMin ? `${l.durationMin} دقيقة` : null}
              sx={{ textAlign: 'right' }}
            />
            {!l.isActive && <Chip size="small" color="warning" label="غير مفعّل" />}
          </ListItemButton>
        );
      })}
    </List>
  );
}

export default LessonList;


