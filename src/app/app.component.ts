import { Component, ViewChild, OnInit, Output, EventEmitter, ElementRef, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import WebViewer, { WebViewerInstance } from '@pdftron/webviewer';
import { core } from '@angular/compiler';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('viewer') viewer: ElementRef;
  wvInstance: WebViewerInstance;
  @Output() coreControlsEvent:EventEmitter<string> = new EventEmitter(); 

  private documentLoaded$: Subject<void>;

  constructor() {
    this.documentLoaded$ = new Subject<void>();
  }

  ngAfterViewInit(): void {

    WebViewer({
      path: '../lib',
      initialDoc: '../files/Lambo Aventador Wheel closeup red brake.png'
    }, this.viewer.nativeElement).then(instance => {
      this.wvInstance = instance;

      this.coreControlsEvent.emit(instance.UI.LayoutMode.Single);

      const { documentViewer, Annotations, annotationManager } = instance.Core;

      instance.UI.openElements(['notesPanel']);

      documentViewer.addEventListener('annotationsLoaded', () => {
        console.log('annotations loaded');
      });

      documentViewer.addEventListener('documentLoaded', () => {
        this.documentLoaded$.next();
        // const rectangleAnnot = new Annotations.RectangleAnnotation({
        //   PageNumber: 1,
        //   // values are in page coordinates with (0, 0) in the top left
        //   X: 100,
        //   Y: 150,
        //   Width: 200,
        //   Height: 50,
        //   Author: annotationManager.getCurrentUser()
        // });
        // annotationManager.addAnnotation(rectangleAnnot);
        // annotationManager.redrawAnnotation(rectangleAnnot);

        this.compareDocumentsPixels();
      });
    })
  }

  ngOnInit() {
  }

  getDocumentLoadedObservable() {
    return this.documentLoaded$.asObservable();
  }

  async compareDocumentsPixels() {

    var doc1 = await this.getDocument('../../files/Lambo Aventador Wheel closeup red brake.png', 'Lambo Aventador Wheel closeup red brake.png');
    await doc1.getDocumentCompletePromise();
    var doc2 = await this.getDocument('../../files/Lambo Aventador Wheel closeup yellow brake.png', 'Lambo Aventador Wheel closeup yellow brake.png');
    await doc2.getDocumentCompletePromise();

    var PageCount: number = Math.min(doc1.getPageCount(), doc2.getPageCount())

      var imageData1 = await this.getImageData(doc1, 1);
      var imageData2 = await this.getImageData(doc2, 1);

      const pixelData1 = (<ImageData>imageData1).data;
      const pixelData2 = (<ImageData>imageData2).data;

      var newImageData = new Uint8ClampedArray((<ImageData>imageData1).width * (<ImageData>imageData1).height * 4);

      for (let i = 0; i < (<ImageData>imageData1).width * (<ImageData>imageData1).height * 4; i += 4) {
        const r1 = pixelData1[i];
        const g1 = pixelData1[i + 1];
        const b1 = pixelData1[i + 2];

        const r2 = pixelData2[i];
        const g2 = pixelData2[i + 1];
        const b2 = pixelData2[i + 2];
        const a2 = pixelData2[i + 3];

        if (Math.abs(r1 - r2) > 5 || Math.abs(g1 - g2) > 5 || Math.abs(b1 - b2) > 5) {
          newImageData[i] = 255;
          newImageData[i + 1] = 0;
          newImageData[i + 2] = 0;
          newImageData[i + 3] = a2;
        }
        else {
          var gray = (r1 + g1 + b1) / 3;
          newImageData[i] = gray;
          newImageData[i + 1] = gray;
          newImageData[i + 2] = gray;
          newImageData[i + 3] = a2;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = (<ImageData>imageData1).width;
      canvas.height = (<ImageData>imageData1).height;
      canvas.getContext('2d').putImageData(new ImageData(newImageData, (<ImageData>imageData1).width, (<ImageData>imageData1).height), 0, 0);


      canvas.toBlob(blob => {
        console.log(blob);
        this.wvInstance.UI.loadDocument(blob, { filename: 'image.png' });
      });
  }

  async getDocument(path: string, filename: string) {
    var { Core } = this.wvInstance;
    const newDoc = await Core.createDocument(path, {
      filename: filename,
      loadAsPDF: true
    });
    return newDoc;
  };

  getImageData(doc , pageIndex = 1) {
    return new Promise(resolve => {
      doc.loadCanvas({
        pageNumber: pageIndex,
        drawComplete: (pageCanvas) => {
          const ctx = pageCanvas.getContext('2d');
          const imageData: ImageData = ctx.getImageData(0, 0, pageCanvas.width, pageCanvas.height);
          resolve(imageData);
        }
      });
    });
  }
}
