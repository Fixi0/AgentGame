import { createManualNewsPost } from './newsSystem';

export const buildDynamicMediaPosts = ({
  week = 1,
  rivalryHighlights = [],
  newgenStories = [],
} = {}) => {
  const posts = [];
  (rivalryHighlights ?? []).slice(0, 2).forEach((item) => {
    posts.push(createManualNewsPost({
      type: 'media',
      week,
      text: `Débat chaud: ${item.title}. ${item.text}`,
      reputationImpact: 0,
      account: { name: 'World Football Wire', kind: 'journal', icon: 'WF', color: '#172026' },
    }));
  });
  (newgenStories ?? []).slice(0, 2).forEach((story) => {
    posts.push(createManualNewsPost({
      type: 'fans',
      week,
      text: `Wonderkid watch: ${story.text}`,
      reputationImpact: 0,
      account: { name: 'Future Stars Monitor', kind: 'media', icon: 'FS', color: '#2f80ed' },
    }));
  });
  return posts;
};

