import type { Meta, StoryObj } from '@storybook/react';
import GeneralAnnouncement from './GeneralAnnouncement';

// This is, like, the main setup for our story file.
// It tells Storybook where to put it in the sidebar.
const meta: Meta<typeof GeneralAnnouncement> = {
  title: 'Components/Announcements/GeneralAnnouncement',
  component: GeneralAnnouncement,
  // This argTypes part is for, like, controlling the props in the Storybook UI
  argTypes: {
    isVisible: { control: 'boolean' },
    onClose: { action: 'closed' }, // This will log to the "Actions" tab when the button is clicked!
  },
};

export default meta;
type Story = StoryObj<typeof GeneralAnnouncement>;

// This is our first story! It shows the component when it's, like, totally visible.
export const Visible: Story = {
  args: {
    isVisible: true,
  },
};

// And this one shows what happens when it's supposed to be hidden.
// It will, like, literally show nothing on the screen, which is perfect!
export const Hidden: Story = {
  args: {
    isVisible: false,
  },
};
