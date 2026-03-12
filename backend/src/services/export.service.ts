import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export class ExportService {
  async toDocx(markdownContent: string): Promise<Buffer> {
    const lines = markdownContent.split('\n');
    const children: Paragraph[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        children.push(new Paragraph({
          text: line.replace('## ', ''),
          heading: HeadingLevel.HEADING_1,
        }));
      } else if (line.startsWith('### ')) {
        children.push(new Paragraph({
          text: line.replace('### ', ''),
          heading: HeadingLevel.HEADING_2,
        }));
      } else if (line.startsWith('**') && line.endsWith('**')) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line.replace(/\*\*/g, ''), bold: true })],
        }));
      } else if (line.startsWith('- ')) {
        children.push(new Paragraph({
          text: line.replace('- ', ''),
          bullet: { level: 0 },
        }));
      } else if (line.trim()) {
        children.push(new Paragraph({ text: line }));
      } else {
        children.push(new Paragraph({ text: '' }));
      }
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    return Packer.toBuffer(doc);
  }

  toMarkdown(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
  }
}

export const exportService = new ExportService();
