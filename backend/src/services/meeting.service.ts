import prisma from '../utils/prisma';

export class MeetingService {
  async createMeeting(userId: string, data: {
    title: string;
    company?: string;
    language: string;
    mode: string;
    participants?: string[];
  }) {
    return prisma.meeting.create({
      data: {
        userId,
        title: data.title,
        company: data.company,
        language: data.language,
        mode: data.mode,
        participants: data.participants || [],
        status: 'preparing',
      },
      include: { transcript: true, minutes: true },
    });
  }

  async getMeetings(userId: string, filters?: { language?: string; search?: string }) {
    return prisma.meeting.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(filters?.language && { language: filters.language }),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { company: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { transcript: true, minutes: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMeetingById(id: string, userId: string) {
    const meeting = await prisma.meeting.findFirst({
      where: { id, userId, deletedAt: null },
      include: { transcript: true, minutes: true, interpretLogs: true },
    });
    if (!meeting) throw new Error('회의를 찾을 수 없습니다.');
    return meeting;
  }

  async updateMeeting(id: string, userId: string, data: Partial<{
    title: string;
    company: string;
    status: string;
    participants: string[];
    audioPath: string;
  }>) {
    return prisma.meeting.update({
      where: { id },
      data,
      include: { transcript: true, minutes: true },
    });
  }

  async deleteMeeting(id: string, userId: string) {
    const meeting = await prisma.meeting.findFirst({ where: { id, userId } });
    if (!meeting) throw new Error('회의를 찾을 수 없습니다.');
    await prisma.meeting.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export const meetingService = new MeetingService();
