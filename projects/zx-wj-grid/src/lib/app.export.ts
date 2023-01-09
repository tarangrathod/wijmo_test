import { Injectable } from '@angular/core';
import * as wjcGrid from '@grapecity/wijmo.grid';
import * as wjcGridXlsx from '@grapecity/wijmo.grid.xlsx';
import * as wjcXlsx from '@grapecity/wijmo.xlsx';
import * as FileSaver from 'file-saver';
export class IExcelExportContext {
  exporting!: boolean;
  progress!: number;
  preparing!: boolean;
}
@Injectable()
export class ExportService {

  startExcelExport(flex: wjcGrid.FlexGrid, ctx: IExcelExportContext, fileName: string) {
    if (ctx.preparing || ctx.exporting) {
      return;
    }
    ctx.exporting = false;
    ctx.progress = 0;
    ctx.preparing = true;
    wjcGridXlsx.FlexGridXlsxConverter.saveAsync(flex, {
      includeColumnHeaders: true,
      includeCellStyles: false,
      formatItem: this._formatExcelItem.bind(this)
    },
      fileName,
      () => {
        this._resetExcelContext(ctx);
      },
      err => {
        this._resetExcelContext(ctx);
      },
      prg => {
        if (ctx.preparing) {
          ctx.exporting = true;
          ctx.preparing = false;
        }
        ctx.progress = prg / 100.;
      },
      true
    );
  }

  cancelExcelExport(ctx: IExcelExportContext) {
    wjcGridXlsx.FlexGridXlsxConverter.cancelAsync(() => {
      this._resetExcelContext(ctx);
    });
  }

  private _formatExcelItem(e: wjcGridXlsx.XlsxFormatItemEventArgs | any) {
    const panel = e.panel;
    if (panel.cellType !== wjcGrid.CellType.Cell) {
      return;
    }

    // highlight invalid cells
    if (panel.grid._getError(panel, e.row, e.col)) {
      const fill = new wjcXlsx.WorkbookFill();
      fill.color = '#ff0000';
      e.xlsxCell.style.fill = fill;
    }
  }

  private _resetExcelContext(ctx: IExcelExportContext) {
    ctx.exporting = false;
    ctx.progress = 0;
    ctx.preparing = false;
  }

  public exportToCsv(grid: wjcGrid.FlexGrid, fileName: string, columns?: any): any {
    columns = [];
    grid.columns.map((e: any) => {
      if ((e?.visible == undefined || e.visible) && e?.binding) {
        if (e?.parentGroup != null && e?.parentGroup?.parentGroup != null) {
          columns[e.binding] = e.parentGroup.parentGroup.header + '(' + e.parentGroup.header + ')(' + e.header + ')'
        } else if (e?.parentGroup != null) {
          columns[e.binding] = e.parentGroup.header + '(' + e.header + ')'
        } else {
          columns[e.binding] = e.header
        }
      }
    });
    let rows: any = grid.itemsSource.items
    if (!rows || !rows.length) {
      return;
    }
    if (grid?.columnFooters?.rows.length) {
      let footerRow: any = grid.columnFooters.rows[0].dataItem;
      grid.columns.map(e => {
        if (!footerRow.hasOwnProperty(e.binding)) {
          if (e.aggregate) {
            let row = 0;
            rows.map(e1 => row += e1[e.binding])
            footerRow[e.binding] = row
          }
        }
      })
      rows.push(footerRow)
    }
    let includeCol = (columns) ? Object.keys(columns) : [];
    let cols = (columns) ? Object.values(columns) : [];
    const separator = ',';
    if (includeCol.length == 0) {
      includeCol = Object.keys(rows[0]).filter(k => {
        return true;
      });
      cols = includeCol;
    }
    const csvContent =
      cols.join(separator) +
      '\n' +
      rows.map(row => {
        return includeCol.map(k => {
          let cell: any = '';
          if (k.includes('.') && !k.includes('[0]')) {
            let k1 = k.split('.');
            if (row[k1[0]] != undefined && row[k1[0]] != null)
              cell = row[k1[0]][k1[1]] === null || row[k1[0]][k1[1]] === undefined ? '' : row[k1[0]][k1[1]];
          } else if (k.includes('[0]')) {
            let k1 = k.split('[0]');
            let ktemp = k1[1].split('.');
            cell = row[k1[0]][0][ktemp[1]] === null || row[k1[0]][0][ktemp[1]] === undefined ? '' : row[k1[0]][0][ktemp[1]];
          } else {
            cell = row[k] === null || row[k] === undefined ? '' : row[k];
          }
          cell = cell instanceof Date
            ? cell.toLocaleString()
            : cell.toString().replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        }).join(separator);
      }).join('\n');
    this.saveAsFile(csvContent, `${fileName}.csv`, 'txt/csv;charset=utf-8;');
  }
  private saveAsFile(buffer: any, fileName: string, fileType: string): void {
    const data: Blob = new Blob([buffer], { type: fileType });
    FileSaver.saveAs(data, fileName);
  }
}
