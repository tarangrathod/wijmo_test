import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ExportService } from './app.export';
import { ZxWjGridComponent } from './zx-wj-grid.component';

@NgModule({
  declarations: [ZxWjGridComponent],
  imports: [CommonModule],
  providers: [ExportService],
  exports: [ZxWjGridComponent],
})
export class ZxWjGridModule {}
